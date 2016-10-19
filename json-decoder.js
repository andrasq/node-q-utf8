/**
 * decode buffers into json string segments
 *
 * Should be fully equivalent to require('string_decoder'), but not verified.
 *
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

module.exports = {
    JsonDecoder: JsonDecoder,
};

function JsonDecoder( encoding ) {
    encoding = encoding ? encoding.toLowerCase().replace(/[-_]/, '') : 'utf8';
    if (!Buffer.isEncoding(encoding)) throw new Error("unknown encoding " + encoding);

    this.encoding = encoding;
    this.fragBuf = new Buffer(8);
    this.fragLength = 0;
    this.nextSubstring = "";

    switch (encoding) {
    case 'utf8':
        this.fragmentByteCount = fragSizeUtf8;
        this.charByteCount = charLengthUtf8;
        break;
    case 'ucs2':
    case 'utf16':
        this.fragmentByteCount = function(buf, base, bound) { return (bound - base) & 1 };
        this.charByteCount = function(ch) { return 2; }
        break;
    case 'base64':
        this.fragmentByteCount = function(buf, base, bound) { return (bound - base) % 3 };
        this.charByteCount = function(ch) { return 3; }
        break;
    case 'hex':
    default:
        this.fragmentByteCount = function(buf, base, bound) { return 0; };
        this.charByteCount = function(ch) { return 1; }
        break;
    }
}

/*
 * convert the buffer and return the longest valid substring,
 * prepending any previous fragment bytes and retaining any trailing ones
 */
JsonDecoder.prototype.write = function write( buf ) {
    var offset = 0, extra, fragString, bufString;

    // first complete an existing fragment with bytes from the buffer
    if (this.fragLength) {
        while (this.fragLength < this.fragNeededLength && offset < buf.length) {
            this.fragBuf[this.fragLength++] = buf[offset++];
        }
        if (this.fragLength < this.fragNeededLength) return '';

        // convert the fragment to string
        fragString = this.fragBuf.toString(this.encoding, 0, this.fragLength);
    }

    // convert the remainder of the buffer to string
    extra = this.fragmentByteCount(buf, offset, buf.length);
    bufString = buf.toString(this.encoding, offset, buf.length - extra);

    // save any new fragment at the end of the buffer for next time
    if (extra) {
        this.fragLength = bufcpy(this.fragBuf, 0, buf, buf.length - extra, extra);
        this.fragNeededLength = this.charByteCount(this.fragBuf[0]);
    }
    else {
        this.fragLength = 0;
        this.fragNeededLength = 0;
    }

    // return the buffer appended to the fragment
    return fragString ? fragString + bufString : bufString;
};

/*
 * convert the buffer like write, but flush any remaining fragment
 */
JsonDecoder.prototype.end = function end( buffer ) {
    var str = '';
    if (buffer && buffer.length) {
        str = this.write(buffer);
    }
    if (this.fragLength) {
        // not all encodings can make a char out of a fragment, but thats all we have
        var str2 = this.fragBuf.toString(this.encoding, 0, this.fragLength);
        str = str ? str + str2 : str2;
        this.fragLength = 0;
    }
    return str;
}

JsonDecoder.prototype = JsonDecoder.prototype;


// copy buffer contents like memcpy(), but returns the number of bytes copied
function bufcpy( dst, p2, src, p1, n ) {
    for (var i=0; i<n; i++) dst[p2++] = src[p1++];
    return n;
}

/*
 * fragSize return the number of bytes belonging to a split last symbol,
 * or 0 if the last symbol is not split.  In some encodings each symbol is
 * itself encoded with multiple characters (eg hex and base64).
 */

// utf8 encodes 1-4 bytes into one char
function fragSizeUtf8( buf, base, bound ) {
    // use switch as a jump table, fall through each case
    // each test checks whether that char starts a split multi-byte char
    switch (bound - base) {
    default:
    //case 3: if ((buf[bound-3] & 0xF0) === 0xF0) return 3;       // 11110xxx 4+ byte char (not js)
    case 2: if ((buf[bound-2] & 0xE0) === 0xE0) return 2;       // 1110xxxx 3+ byte char
    case 1: if ((buf[bound-1] & 0xC0) === 0xC0) return 1;       // 110xxxxx 2+ byte char
    case 0: return 0;
    }
}

// return the length in bytes of the multi-byte utf8 encoding starting with the given byte
// 16-bit javascript utf8 only has 2-, and 3-byte encodings
function charLengthUtf8( ch ) {
    //if (ch >= 0xF0) return 4; else
    if (ch >= 0xE0) return 3;
    else /* if (ch >= 0xC0) */ return 2;
    // if (ch >= 0x80) invalid
    //else return 1;
}

// hex encodes one byte as two chars
function fragSizeHex( buf, base, bound ) {
    return 0;
}

function charLengthHex( ch ) {
    return 1;
}

// base64 encodes groups of three bytes into four chars
function fragSizeBase64( buf, base, bound ) {
    return (bound - base) % 3;
}

function charLengthBase64( ch ) {
    return 3;
}

// accelerate access
JsonDecoder.prototype = JsonDecoder.prototype;
