/**
 * base64 encode bytes, from qbson object-id.js
 *
 * Copyright (C) 2016-2019 Andras Radics
 * Licensed under the Apache License, Version 2.0
 *
 * 2016-10-18 - AR.
 */

'use strict';


var _base64charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
var _base64digits = new Array(64);
for (var i=0; i<64; i++) _base64digits[i] = _base64charset[i];
var _base64pad = [ '', '===', '==', '=' ];

// base64url uses the same chars except for the last two changing from '+/' to '-_'
var _base64urldigits = new Array(64);
for (var i=0; i<64; i++) _base64urldigits[i] = _base64charset[i];
_base64urldigits[62] = '-';
_base64urldigits[63] = '_';


module.exports = {
    _base64digits: _base64digits,
    _base64urldigits: _base64urldigits,
    bytesToBase64: bytesToBase64,
    encode: function base64_encode( bytes, base, bound ) {
        var str = module.exports.bytesToBase64(bytes, base, bound, _base64digits);
        // base64 encoding must pad the result with '=' to a multiple of 4 chars
        if (str.length & 0x03) str += _base64pad[str.length & 0x03];
        return str;
    },
    // decode: TBD
    encodeurl: function base64_encodeurl( bytes, base, bound ) {
        var str = module.exports.bytesToBase64(bytes, base, bound, _base64urldigits);
        // base64url encoding does not pad the encoded string
        return str;
    },
    // decodeurl: TBD
};

/*
 * extract the byte range from the buffer as a base64 string
 * for 12 bytes 10% slower than buf.toString, is faster for fewer
 */
function bytesToBase64( bytes, base, bound, digits ) {
    if (bound == null || bound > bytes.length) bound = bytes.length;
    if (!base || base < 0) base = 0;

    var str = "";
    for (var i=base; i<=bound-3; i+=3) {
        str += _emit3base64(digits, bytes[i], bytes[i+1], bytes[i+2]);
    }
    if (i >= bound) return str;
    return ((bound - i) == 2) ? str + _emit2base64(digits, bytes[i], bytes[i+1])
                              : str + _emit1base64(digits, bytes[i]);
}

function _emit3base64( digits, a, b, c ) {
    return digits[((a >> 2)) & 0x3F] +
           digits[((a << 4) | (b >> 4)) & 0x3F] +
           digits[((b << 2) | (c >> 6)) & 0x3F] +
           digits[c & 0x3F];
}

function _emit2base64( digits, a, b ) {
    return digits[a >> 2] +
           digits[(a & 0x3) << 4 | (b >> 4)] +
           digits[(b & 0xF) << 2];
}

function _emit1base64( digits, a ) {
    return digits[a >> 2] +
           digits[(a & 0x3) << 4];
}

