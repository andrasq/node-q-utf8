/**
 * base64 encode bytes, from qbson object-id.js
 *
 * 2016-10-18 - AR.
 */

'use strict';

module.exports = {
    bytesToBase64: bytesToBase64,
    encode: function base64_encode( bytes, base, bound ) {
        if (!bound || bound > bytes.length) bound = bytes.length;
        if (!base || base < 0) base = 0;
        return module.exports.bytesToBase64(bytes, base, bound);
    },
    // decode: TBD
};

var _base64charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
var _base64digits = new Array(64);
for (var i=0; i<64; i++) _base64digits[i] = _base64charset.slice(i, i+1);

var _base64pad = ['', '===', '==', '='];

/*
 * extract the byte range from the buffer as a base64 string
 * for 12 bytes 10% slower than buf.toString, is faster for fewer
 */
function bytesToBase64( bytes, base, bound ) {
    var str = "";
    for (var i=base; i<bound-3; i+=3) {
        str += _emit3base64(bytes[i], bytes[i+1], bytes[i+2]);
    }
    switch (bound - i) {
    case 3: str += _emit3base64(bytes[i], bytes[i+1], bytes[i+2]); i += 3; break;
    case 2: str += _emit2base64(bytes[i], bytes[i+1]); i += 2; break;
    case 1: str += _emit1base64(bytes[i]); i += 1; break;
    }
    if (str.length & 0x3) str += _base64pad[str.length & 0x3];
    return str;
}

function _emit3base64( a, b, c ) {
    return _base64digits[a >> 2] +
           _base64digits[((a << 4) | (b >> 4)) & 0x3F] +
           _base64digits[((b << 2) | (c >> 6)) & 0x3F] +
           _base64digits[c & 0x3F];
}

function _emit2base64( a, b ) {
    return _base64digits[a >> 2] +
           _base64digits[(a & 0x3) << 4 | (b >> 4)] +
           _base64digits[(b & 0xF) << 2];
}

function _emit1base64( a ) {
    return _base64digits[a >> 2] +
           _base64digits[(a & 0x3) << 4];
}

