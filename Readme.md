q-utf8
======

Js-only utf8 string manipulation.

The built-in nodejs utf8 conversion functions are implemented as fast native
C++ modules.  Nodejs, however, is rather slow to call native modules.  For
short strings the call overhead outweighs the benefits, making it faster
(sometimes much faster) to compute the results in javascript.

These functions were originally developed as part of the
[`qbson`](https://github.com/andrasq/node-qbson) library.


Api
---

    var qutf8 = require('q-utf8');

### qutf8.utf8_encode( string, from, to, target, offset )

convert the substring to utf8 and place the bytes into target starting at offset

### qutf8.utf8_decode( buf, base, bound )

convert the range of utf8 bytes to a string

### qutf8.utf8_encodeJson( string, from, to, target, offset )

like utf8_encode, but control chars 0x00..0x19 are \\-escaped `\n` or \\u-escaped
`\u0001`

### qutf8.utf8_stringLength( buf, base, bound [,encoding] )

length of the utf8 substring represented by the bytes between base and bound.
Bytes not tested to be valid for the encoding.  Default encoding is 'utf8'.

### qutf8.utf8_byteLength( string, from, to )

number of bytes the string will occupy when output or stored in a Buffer

### qutf8.utf8_encodeOverlong( string, from, to, target, offset )

like utf8_encode but `'\0'` chars are encoded as `'\xC0\x80'` not `'\u0000'`.
`C0 80` and `E0 80 80` are valid utf8 and both decode into a `00` character.

### qutf8.base64_encode

encode the byte range as a base64 string

### qutf8.JsonDecoder

this is an experiment, a work in progress.
Over time it evolved into a work-alike of `require('string_decoder')`.


Change Log
----------

- 0.1.0 - initial version, to get it out there


Todo
----

- unit tests
- benchmarks
- reconcile method names, eg encodeUtf8 vs utf8_encode


Related Work
------------

- [`qbson`](https://github.com/andrasq/node-qbson') - mongodb bson conversion functions
