/**
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */


'use strict';

var JsonDecoder = require('./json-decoder').JsonDecoder;


// quicktest:
///**

var assert = require('assert');
var timeit = require('qtimeit');
var string_decoder = require('string_decoder');

var buf = new Buffer("Hello, world.\nHello, world.\n");
var buf = new Buffer("\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82");
var buf = new Buffer("Hello, world.\n");        // plaintext
//var buf = new Buffer("\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82\x81\x82");       // 2-byte utf8 chars
//var buf = new Buffer("\uf000\uf000\uf000\uf000\uf000\uf000\uf000\uf000\uf000\uf000\uf000\uf000\uf000\uf000"); // 3-byte utf8 chars
console.log(buf);
var maxPartLength = 12;
var t1 = Date.now();
for (var len = 1; len <= maxPartLength; len+=1) {
    var data = [];
    for (var i=0; i<buf.length; i+=len) data.push(buf.slice(i, i+len));

    console.log("parts of len", len);

    var arj = new JsonDecoder();
    var sys = new string_decoder.StringDecoder();
    for (var i=0; i<data.length; i++) assert(arj.write(data[i]) === sys.write(data[i]));

    var x = '';
    var arj = new JsonDecoder();
    timeit(100000, function(){ x = ''; for (var i=0; i<data.length; i++) x += arj.write(data[i]); arj.end(); });
    //console.log(x);
    // 335k/s, ie 5 million buffers appended 1-ch, 600k/s 2-ch, 835k/s 3-ch, 1m/s 4-ch ("Hello, world.")

    var sys = new string_decoder.StringDecoder();
    timeit(100000, function(){ x = ''; for (var i=0; i<data.length; i++) x += sys.write(data[i]); sys.end(); });
    // 338k/s 1-ch, 630k/s 2-ch, 875k/s 3-ch, 1m/s 4-ch ("Hello, world.")
    //console.log(x);
}
var t2 = Date.now();
console.log("AR: total test time %d ms", t2 - t1);

/**/

/**

Notes:
- basically tied with StringDecoder for plain ascii, very slightly slower
- 30% faster overall for multi-byte utf8, occasionally slightly slower for 2-ch buffers

**/
