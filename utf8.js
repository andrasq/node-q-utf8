/**
 * calls to read/write utf8 text into buffers
 *
 * Copyright (C) 2016-2021 Andras Radics
 * Licensed under the Apache License, Version 2.0
 *
 * 2016-05-06 - AR.
 */

'use strict';

module.exports = {
    encodeUtf8: encodeUtf8,
    encodeJson: encodeJson,
    decodeUtf8: decodeUtf8,
    scanStringZUtf8: scanStringZUtf8,
    stringLength: stringLength,
    byteLength: byteLength,
    utf8FragmentBytes: utf8FragmentBytes,
    encodeUtf8Overlong: encodeUtf8Overlong,
};


var byteHexMap = new Array();
for (var i=0; i<16; i++) byteHexMap[i] = '0' + i.toString(16);
for (var i=16; i<256; i++) byteHexMap[i] = i.toString(16);

// a js loop is faster for short strings, but quickly loses out to buf.toString().length
function stringLength( buf, base, bound, encoding ) {
    var length = 0;
    switch (encoding) {
    case undefined:
    case 'utf8':
        for (var i=base; i<bound; i++) {
            // multi-byte utf8 chars are of the form [11...][10...][10...]
            if (buf[i] <= 0x7F || (buf[i] & 0xC0) !== 0x80) length += 1;
        }
        break;
    case 'hex': return (bound - base) * 2;
    case 'base64': return 4 * Math.ceil((bound - base) / 3);
    default: return buf.toString(encoding, base, bound).length;
    }
    return length;
}

// count how many bytes of storage the string will require
// The string must be valid utf8.
function byteLength( string, from, to ) {
    var code, len = 0;
    for (var i=from; i<to; i++) {
        code = string.charCodeAt(i);
        len += (code <= 0x007F) ? 1 : (code <= 0x07FF) ? 2 : 3;
    }
    return len;
}

// return the count of bytes at the end of the range that are part of a split multi-byte utf8 char
// Out of range bounds are not checked.  Invalid utf8 sequences are not checked.
function utf8FragmentBytes( buf, base, bound ) {
    // use switch as a jump table, fall through each case
    // each test checks whether that char starts a split multi-byte char
    switch (bound - base) {
    default:
    case 3: if ((buf[bound-3] & 0xF0) === 0xF0) return 3;       // 11110xxx 4+ byte char (not utf16)
    case 2: if ((buf[bound-2] & 0xE0) === 0xE0) return 2;       // 1110xxxx 3+ byte char
    case 1: if ((buf[bound-1] & 0xC0) === 0xC0) return 1;       // 110xxxxx 2+ byte char
    case 0: return 0;
    }
}

// handle the mechanics of utf8-encoding a 16-bit javascript code point
// The caller must filter out invalid utf8 code points.
// Node inlines this and optimizes away the redundant 7-bit check at the top
function encodeUtf8Char( code, target, offset ) {
    if (code <= 0x7F) {         // 7 bits:  0xxx xxxx
        target[offset++] = code;
    }
    else if (code <= 0x07FF) {  // 8..11 bits, 2-byte:  110x xxxx  10xx xxxx
        target[offset++] = 0xC0 | (code >> 6) & 0x3F;
        target[offset++] = 0x80 | code & 0x3F;
    }
    else if (code <= 0xFFFF) {  // 11..16 bits, 3-byte:  1110 xxxx  10xx xxxx  10xx xxxx
        target[offset++] = 0xE0 | (code >> 12) & 0x0F;
        target[offset++] = 0x80 | (code >> 6) & 0x3F;
        target[offset++] = 0x80 | (code) & 0x3F;
    }
    return offset;
}

function encodeUtf8SurrogatePair( code, code2, target, offset ) {
    // 17..21 bits, 4-byte:  1111 0xxx  10xx xxxx  10xx xxxx  10xx xxxx
    var codepoint = 0x10000 + ((code - 0xD800) << 10) + (code2 - 0xDC00);
    target[offset++] = 0xF0 | (codepoint >> 18) & 0x07;
    target[offset++] = 0x80 | (codepoint >> 12) & 0x3F;
    target[offset++] = 0x80 | (codepoint >>  6) & 0x3F;
    target[offset++] = 0x80 | (codepoint      ) & 0x3F;
    return offset;
}

/*
 * write the utf8 string into the target buffer starting at offset
 * The buffer must be large enough to receive the entire converted string (not checked)
 * Notes:
 *   Utf8 stores control chars as-is, but json needs them \u escaped.
 *   code points D800..DFFF are not valid utf8 (Rfc-3629),
 *   node encodes them all as FFFF - 2, FFFD (chars EF BF BD)
 */
function encodeUtf8( string, from, to, target, offset ) {
    var code, code2;
    for (var i=from; i<to; i++) {
        code = string.charCodeAt(i);
        if (code <= 0x7F) target[offset++] = code;
        else if (code >= 0xD800 && code <= 0xDFFF) {
            var code2 = string.charCodeAt(i + 1);
            if (i + 1 < to && code <= 0xDBFF && code2 >= 0xDC00 && code2 <= 0xDFFF) {
                // valid leading,trailing surrogate pair containing a 20-bit code point
                offset = encodeUtf8SurrogatePair(code, code2, target, offset);
                i += 1;
            } else {
                // lone leading surrogate or bare trailing surrogate are invalid, become FFFD
                offset = encodeUtf8Char(0xFFFD, target, offset);
            }
        }
        else offset = encodeUtf8Char(code, target, offset);
    }
    return offset;
}

// just like encodeUtf8, but 00 bytes are overlong-encoded (runs 2.5-15% slower)
// Note that the pointless comment strings in the source allow it to run 10% faster.
// NOTE: overlong-encoded characters eg [0xC0, 0x80] are rejected by Buffer (converts to \uFFFD\uFFFD)
function encodeUtf8Overlong( string, from, to, target, offset ) {
    var code;
    for (var i=from; i<to; i++) {
        code = string.charCodeAt(i);
        // keep this verbiage here, it runs faster...
        // overlong encode 0x00 to allow NUL bytes <00> in strings....
        if (code <= 0x7F) { if (code) target[offset++] = code; else { target[offset++] = 0xC0; target[offset++] = 0x80; } }
        else if (code >= 0xD800 && code <= 0xDFFF) {
            target[offset++] = 0xEF; target[offset++] = 0xBF; target[offset++] = 0xBD;
        }
        else offset = encodeUtf8Char(code, target, offset);
    }
    return offset;
}

/*
 * recover the utf8 string between base and bound
 * The bytes are expected to be valid utf8, no checking is done.
 * Returns a string.
 * Handles utf16 only (16-bit code points), same as javascript.
 * Note: faster for short strings, slower for long strings
 * Note: generates more gc activity than buf.toString
 */
// 1-byte utf8 0xxx xxxx
// 2-byte utf8 110x xxxx 10xx xxxx
// 3-byte utf8 1110 xxxx 10xx xxxx 10xx xxxx
// 4-byte utf8 1111 0xxx 10xx xxxx 10xx xxxx 10xx xxxx -- not valid as javascript chars
// NOTE: 4-byte utf8 chars will produce codepoints outside the javascript utf16 range,
// and String.fromCharCode() will truncate them to 16 bits and break them.
// Note: there are 1.1 million valid Unicode codepoints, 0 .. 0x10FFFF.
// 66 are defined as non-characters, and 2048 are reserved for surrogate pairs.
// Final Utf-8 standard is RFC-3629, http://tools.ietf.org/html/rfc3629

// FIXME: Leading, also called high, surrogates are from D800 to DBFF, and trailing, or
// low, surrogates are from DC00 to DFFF. They are called surrogates, since they do not
// represent characters directly, but only as a pair.
// AR: 1101 10xx xxxx xxxx -- 1101 11xx xxxx xxxx (good for 20-bit codepoints)
// AR: see also https://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
//
// "Unpaired surrogates are invalid in UTFs. These include any value in the range D80016 to
// DBFF16 not followed by a value in the range DC0016 to DFFF16, or any value in the range
// DC0016 to DFFF16 not preceded by a value in the range D80016 to DBFF16."

// convert the 4-byte utf8 encoding into a surrogate pair of utf16 chars
function decodeUtf8SurrogatePair( b1, b2, b3, b4 ) {
    var codepoint = ((b1 & 0x07) << 18) + ((b2 & 0x3f) << 12) + ((b3 & 0x3f) << 6) + (b4 & 0x3f);
    return String.fromCharCode(0xD800 + ((codepoint - 0x10000) >> 10))
         + String.fromCharCode(0xDC00 + ((codepoint - 0x10000) & 0x3FF));
}

function decodeUtf8( buf, base, bound ) {
    var ch, str = "", code;
    for (var i=base; i<bound; i++) {
        ch = buf[i];
        if (ch < 0x80) str += String.fromCharCode(ch);  // 1-byte
        else if (ch < 0xC0) str += '\uFFFD'; // invalid multi-byte start (continuation byte)
        else if (ch < 0xE0) str += String.fromCharCode(((ch & 0x1F) <<  6) + (buf[++i] & 0x3F));  // 2-byte
        else if (ch < 0xF0) str += String.fromCharCode(((ch & 0x0F) << 12) + ((buf[++i] & 0x3F) << 6) + (buf[++i] & 0x3F));  // 3-byte
        else if (ch < 0xF8) str += decodeUtf8SurrogatePair(ch, buf[++i], buf[++i], buf[++i]); // 4-byte
        else str += '\ufffd';
    }
    return str;
}

// TODO: think about whether full error checking is necessary.  The code runs 32% faster without (so 25% validation overhead)
function scanStringZUtf8( buf, base, entity ) {
    var ch, ch2, ch3, ch4, str = "", code;
    for (var i=base; buf[i]; i++) {
        ch = buf[i];
        if (ch < 0x80) { str += String.fromCharCode(ch); continue; }    // 1-byte
        if (ch < 0xC0) { str += '\uFFFD'; continue; }                   // invalid multi-byte start (continuation byte)

        ch2 = buf[++i];
        if (ch2 < 0x80) { str += '\uFFFD' + StringFromCharCode(ch2); continue } // 7-bit ascii is invalid as continuation byte
        else if (ch2 >= 0xC0) { str += '\uFFFD'; i--; continue; }               // utf8 multi-byte start char invalid as continuation byte
        if (ch < 0xE0) { str += String.fromCharCode(((ch & 0x1F) <<  6) + (ch2 & 0x3F)); continue; } // 2-byte

        ch3 = buf[++i];
        if (ch < 0x80) { str += '\uFFFD' + StringFromCharCode(ch3); continue }
        else if (ch3 >= 0xC0) { str += '\uFFFD'; i--; continue; }
        if (ch < 0xF0) { str += String.fromCharCode(((ch & 0x0F) << 12) + ((ch2 & 0x3F) << 6) + (ch3 & 0x3F)); continue; } // 3-byte

        ch4 = buf[++i];
        if (ch4 < 0x80) { str += '\uFFFD' + StringFromCharCode(ch4); continue }
        else if (ch4 >= 0xC0) { str += '\uFFFD'; i--; continue; }

        // assemble the 4-byte codepoint, return overlong encoded single chars
        var codepoint = ((ch & 0x7) << 18) + ((ch2 & 0x3F) << 12) + ((ch3 & 0x3F) << 6) + (ch4 & 0x3F);
        if (codepoint < 0x10000) { str += String.fromCharcode(codepoint);  continue }   // overlong encoded single char
        // if (codepoint >= 0x10FFFF) { str += '\uFFFD'; continue }                     // valid, but too many bits for utf16 (max 20) -- cannot occur per utf8 spec

        // or convert the 4-byte char into a surrogate pair of utf16 chars
        codepoint -= 0x10000;
        str += String.fromCharCode(0xD800 + (codepoint >>> 10)) +
               String.fromCharCode(0xDC00 + (codepoint & 0x3FF));
    }
    entity.val = str;
    return (entity.end = i) + 1;
}

/*
 * encode the string into valid json.  Json is like utf8, but
 * it \u escapes control characters or \-escapes terminal formatting chars \b \n \r etc.
 * Node recognizes BS TAB NL VT FF CR in strings (not \a BEL), but JSON does not \-escape \v VT.
 */
var hexCharCodes = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f' ];
for (var i=0; i<hexCharCodes.length; i++) hexCharCodes[i] = hexCharCodes[i].charCodeAt(0);
// char codes for the control chars 0-0x1F.
var backslashCharCodes = [
   0,   0,   0,   0,   0,   0,   0,   0,
  'b', 't', 'n',  0,  'f', 'r',  0,   0,
   0,   0,   0,   0,   0,   0,   0,   0,
   0,   0,   0,   0,   0,   0,   0,   0,
];
for (var i=0; i<backslashCharCodes.length; i++) {
    if (backslashCharCodes[i]) backslashCharCodes[i] = backslashCharCodes[i].charCodeAt(0);
}
function encodeJsonControlChar( code, target, offset ) {
    if (backslashCharCodes[code]) {
        target[offset++] = 0x5c;
        target[offset++] = backslashCharCodes[code];
        return offset;
    }
    target[offset++] = 0x5c;  // \
    target[offset++] = 0x75;  // u
    target[offset++] = 0x30;  // 0
    target[offset++] = 0x30;  // 0
    target[offset++] = hexCharCodes[code >> 4];
    target[offset++] = hexCharCodes[code & 0x0F];
    return offset;
}

/*
 * JSON is utf8 with the 32 control chars 0x00 - 0x1F \u escaped, eg '\u001F'.
 * Multi-byte utf8 chars are valid in json strings.
 */
function hexcode(v) { return v < 10 ? 0x30 + v : 0x61 + v - 10 }
function encodeJson( string, from, to, target, offset ) {
    var code;
    for (var i=from; i<to; i++) {
        code = string.charCodeAt(i);
        if (code <= 0x1F) offset = encodeJsonControlChar(code, target, offset); // control
        else if (code === 0x22) { target[offset++] = 0x5c; target[offset++] = 0x22; }  // "
        else if (code === 0x5c) { target[offset++] = 0x5c; target[offset++] = 0x5c; }  // \
        else if (code <= 0x7F) target[offset++] = code;  // ascii
        else if (code >= 0xD800 && code <= 0xDFFF) {  // surrogate
            var code2 = string.charCodeAt(i + 1);
            if (i + 1 < to && code <= 0xDBFF && code2 >= 0xDC00 && code2 <= 0xDFFF) {
                offset = encodeUtf8SurrogatePair(code, code2, target, offset);
                i += 1;
            } else {
                // JSON encodes an invalid surrogate as a literal "\uxxxx" unicode hex char
                target[offset++] = '\\'.charCodeAt(0); target[offset++] = 'u'.charCodeAt(0);
                target[offset++] = hexcode((code >> 12) & 0xf); target[offset++] = hexcode((code >> 8) & 0xf);
                target[offset++] = hexcode((code >>  4) & 0xf); target[offset++] = hexcode((code >> 0) & 0xf);
            }
        }
        else offset = encodeUtf8Char(code, target, offset); // multi-byte
    }
    return offset;
}


/** quicktest:

var assert = require('assert');
var timeit = require('qtimeit');

var s1 = "0123456789abcdef\x00\x01\x02\x03\u1001\u1002\u1003\u1004abcd"; // 313%
var s2 = "ssssssssssssssssssss"; // 325%
var s3 = "ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss"; // 200ch: 50%
var s3 = "ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss";  // 100ch: 86%
var s3 = "ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss"; // 64ch: 115%
var s3 = "ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss"; // 80ch: 106%
// v5: about 2m/s for 100 chars; breakeven around 95? (ie, faster if < 95)
//var s4 = s4 + s4 + s4 + s4 + s4 + s4 + s4 + s4 + s4 + s4;
var s4 = "sssssssss\u1004sssssssss\u1004sssssssss\u1004sssssssss\u1004sssssssss\u1004sssssssss\u1004sssssssss\u1004sssssssss\u1004sssssssss\u1004sssssssss\u1004"; // 100ch, 10% 3-byte uft8: 175%
var s4 = "sssssssss\u01ffsssssssss\u01ffsssssssss\u01ffsssssssss\u01ffsssssssss\u01ffsssssssss\u01ffsssssssss\u01ffsssssssss\u01ffsssssssss\u01ffsssssssss\u01ff"; // 100ch, 10% 2-byte uft8: 175% 9-bit and up codes
var s4 = "sssssssss\u0081sssssssss\u0081sssssssss\u0081sssssssss\u0081sssssssss\u0081sssssssss\u0081sssssssss\u0081sssssssss\u0081sssssssss\u0081sssssssss\u0081"; // 100ch, 10% 2-byte uft8: 88% - 8-bit codes... mapped?
// v5: js consistently faster when has 10% 3-byte utf8
var s5 = "ssssssssssssssssssss\x01ssssssssssssssssssss\x01";
var s6 = "ssssssssssssssssssss\x01";
var s7 = "ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss";
var s8 = "\u0081\u0082\u0083\u0084\u0081\u0082\u0083\u0084\u0081\u0082\u0083\u0084\u0081\u0082\u0083\u0084\u0081\u0082\u0083\u0084";
var buf = new Buffer(20000);
var x;

var s = s4;

console.log("AR: test string:", s);
timeit(400000, function(){ buf.write(s, 0, Buffer.byteLength(s)) });
timeit(400000, function(){ buf.write(s, 0, Buffer.byteLength(s)) });
timeit(400000, function(){ buf.write(s, 0, Buffer.byteLength(s)) });

timeit(400000, function(){ encodeUtf8(s, 0, s.length, buf, 0) });
timeit(400000, function(){ encodeUtf8(s, 0, s.length, buf, 0) });
timeit(400000, function(){ encodeUtf8(s, 0, s.length, buf, 0) });
console.log(buf);
// 10k v5: 4m/s s1, 6m/s s2, 770k/s s3, 1.37m/s s4, 3.2m/s s5, 5.7m/s s6, 2.4m/s s7
// 400k: v5: 5.3m/s s1, 9.2m/s s2, 1.0m/s s3, 1.5m/s s4, 4.65m/s s5, 8.7m/s s6, 3.3m/s s7, 5.35m/s s8
// FASTER for all but very long ascii strings

// note: buf.write() returns the number of bytes written, and does not split chars.
// But what happens when end of buffer is reached?  (how to know when to grow buffer?)
timeit(400000, function(){ buf.write(s, 0, Buffer.byteLength(s)) });
timeit(400000, function(){ buf.write(s, 0, Buffer.byteLength(s)) });
timeit(400000, function(){ buf.write(s, 0, Buffer.byteLength(s)) });
console.log(buf);
// 10k v5: 1.3m/s s1, 1.9m/s s2, 1.65m/s s3, 685k/s s4, 1.95m/s s5, 1.9m/s s6, 1.9m/s s7, 2.4m/s s8
// 400k v5: 1.6m/s s1, 2.5m/s s2, 2.1m/s s3, 755k/s s4, 2.48m/s s5,s6,s7, 2.37m/s s8

var buf1 = new Buffer([0,0,0,0,1]);
var buf2 = new Buffer([0,0,0,0,1]);
for (var i=0; i<0x10000; i++) {
    encodeUtf8(String.fromCharCode(i), 0, 1, buf1, 0);
    buf2.write(String.fromCharCode(i), 0);
    assert.deepEqual(buf1, buf2);
}
// code points D800..DFFF are not valid utf8.  Node encodes them as 0xFFFF - 2
//var buf = new Buffer("\uFFFE");
//console.log(buf);
// test: compatibility of the first 10k code points (or all 65k?) (compare vs buf.write)
// test: compatibility of json coding with JSON.parse()

/**/

