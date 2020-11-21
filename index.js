'use strict';

var utf8 = require('./utf8');
var base64 = require('./base64');
var JsonDecoder = require('./json-decoder');

module.exports = {
    utf8_encode: utf8.encodeUtf8,
    utf8_encodeJson: utf8.encodeJson,
    utf8_decode: utf8.decodeUtf8,
    utf8_stringLength: utf8.stringLength,
    utf8_byteLength: utf8.byteLength,
    utf8_encodeOverlong: utf8.encodeUtf8Overlong,
    utf8_scanStringZ: utf8.scanStringZUtf8,

    base64_encode: base64.encode,
    // base64_decode: TBD

    JsonDecoder: JsonDecoder.JsonDecoder,

    encode: utf8.encodeUtf8,
    decode: utf8.decodeUtf8,
};

