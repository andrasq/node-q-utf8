/**
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */


'use strict';

var JsonDecoder = require('./json-decoder').JsonDecoder;


// quicktest:
///**

var timeit = require('qtimeit');
var string_decoder = require('string_decoder');

var buf = new Buffer("Hello, world.\n");
var buf = new Buffer("\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82");
for (var len = 1; len <= 12; len+=1) {
    var data = [];
    for (var i=0; i<buf.length; i+=len) data.push(buf.slice(i, i+len));

    console.log("parts of len", len);

    var x = '';
    var arj = new JsonDecoder();
    timeit(100000, function(){ x = ''; for (var i=0; i<data.length; i++) x += arj.write(data[i]); arj.end(); });
    //console.log(x);
    // 360k/s, ie 5 million buffers appended 1-ch, 600k/s 2-ch, 820k/s 3-ch, 1m/s 4-ch

    var sys = new string_decoder.StringDecoder();
    timeit(100000, function(){ x = ''; for (var i=0; i<data.length; i++) x += sys.write(data[i]); sys.end(); });
    //console.log(x);
}

/**/

/**

Notes:
- above is 7-8% faster than the built-in StringDecoder for plain ascii
- above is 30% slower for 2-byte uft8 of len 4,5 (but is 25% faster for len 3, 350% faster for 1, 1% slower for 2)

**/
