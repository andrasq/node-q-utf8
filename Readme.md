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

encode the substring between `from` and `to` as utf8 bytes into the buffer
starting at offset, and return the number of bytes written.  Does not check
for overflow. The converted bytes are identical to `buffer.write`. Does not
use `string.slice` or `buffer.write`.

### qutf8.utf8_decode( buf, base, bound )

return the utf8 encoded string in the buffer between offset and limit.
Traverses the buffer, does not use `buffer.toString`. Note: for non-trivial
strings buffer.toString() is faster.

### qutf8.utf8_encodeJson( string, from, to, target, offset )

like utf8_encode, but control chars 0x00..0x19 are \\-escaped `\n` or \\u-escaped
`\u0001` and backslashes `\` and double quotes `"` are backslash-escaped as `\\` and `\"`.

### qutf8.utf8_encodeOverlong( string, from, to, target, offset )

like utf8_encode but `'\0'` chars are encoded as `\xC0\x80` not `\u0000`.
`C0 80` and `E0 80 80` are valid utf8 bytes and both decode into a `00` character.

### qutf8.utf8_stringLength( buf, base, bound [,encoding] )

return the length of the utf8 encoded string found in the buffer between
offset and limit.  The string is presumed valid utf8 and is not tested for
validity. Examines the buffer, does not use `buffer.toString`.  Default
encoding is 'utf8'.

### qutf8.utf8_byteLength( string, from, to )

return the number of bytes needed to store the specified portion of the string.
Examines the string, does not use `Buffer.byteLength`.

### qutf8.base64_encode( buf, base, bound )

encode the byte range as a base64 string

### qutf8.JsonDecoder( encoding )

this was an experiment in reassembly of split utf8 byte strings, and is
still a work in progress.  Over time it has evolved into a fast
work-alike of `require('string_decoder')`.


Change Log
----------

- 0.1.2 - base64 fixes, cleanups
- 0.1.1 - speed up JsonDecoder, now up to 50% faster than `string_decoder`
- 0.1.0 - initial version, to get it out there


Todo
----

- unit tests
- benchmarks
- reconcile method names, eg encodeUtf8 vs utf8_encode
- decide whether to handle 4-byte (non-js) utf8


Related Work
------------

- [`qbson`](https://github.com/andrasq/node-qbson) - mongodb bson conversion functions
