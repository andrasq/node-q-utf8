/**
 * Copyright (C) 2016,2020 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var assert = require('assert');
var base64 = require('../base64');
var base64_encode = base64.encode;

assert.equal(base64_encode(new Buffer("a")), "YQ==");
assert.equal(base64_encode(new Buffer("aa")), "YWE=");
assert.equal(base64_encode(new Buffer("aaa")), "YWFh");
assert.equal(base64_encode(new Buffer("aaaa")), "YWFhYQ==");
assert.equal(base64_encode(new Buffer("abc")), "YWJj");
assert.equal(base64_encode(new Buffer("1234567890")), "MTIzNDU2Nzg5MA==");

assert.equal(base64_encode(new Buffer("abc"), 1, 0), "");
assert.equal(base64_encode(new Buffer("abc"), 1, 2), "Yg==");
assert.equal(base64_encode(new Buffer("abc"), 1, 3), "YmM=");
assert.equal(base64_encode(new Buffer("abc"), 1, 7), "YmM=");
assert.equal(base64_encode(new Buffer("abc"), -1, 7), "YWJj");

var src = new Buffer("foobarfoobar");
require("qtimeit")(2000000, function() { x = base64.encode(src) });
require("qtimeit")(2000000, function() { x = src.toString("base64") });
// base64 is 22m/s for 3 chars, 11m/s for 6 chars, 7.1m/s for 9 chars
// Buffer.toString is 7.8m/s for 3 chars, 7.6m/s for 6 chars, 7.4m/s for 9 chars

var src = "Hello, world.\n".split('').map(function(ch) { return ch.charCodeAt(0) });
var src2 = new Buffer(src);
var x;
require("qtimeit")(2000000, function() { x = base64.encode(src) });
require("qtimeit")(2000000, function() { x = base64.encode(src2) });
require("qtimeit")(2000000, function() { x = base64.encodeurl(src2) });
//require("qtimeit")(2000000, function() { x = base64.bytesToBase64(src2, 0, src2.length, base64._base64digits) });  // about the same
require("qtimeit")(2000000, function() { x = src2.toString("base64") });
