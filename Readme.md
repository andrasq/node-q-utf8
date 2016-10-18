q-utf8
======

js-only string to/from bytes conversion functions


Api
---

    var qutf8 = require('q-utf8');

### qutf8.utf8_encode

convert the string to utf8 bytes

### qutf8.utf8_decode

convert the utf8 bytes to a string

### qutf8.utf8_encodeJson

like utf8_encode, but control chars 0x00..0x19 are \-escaped `\n` or \u-escaped
`\u0001`

### qutf8.utf8_stringLength

length of the utf8 substring represented by the bytes between base and bound.
Bytes not tested to be valid utf8.

### qutf8.utf8_byteLength

number of bytes the string will occupy when output

### qutf8.utf8_encodeOverlong

like utf8_encode but `'\0'` chars are encoded as `'\xC0\x80'` not `'\u0000'`.
`C0 80` and `E0 80 80` are valid utf8 and both decode into a `00` character.

### qutf8.base64_encode

encode the byte range as a base64 string

### qutf8.JsonDecoder

this is an experiment, a work in progress.
Over time it evolved into a work-alike of `require('string_decoder')`.
