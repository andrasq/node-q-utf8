/**
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var assert = require('assert');
var base64 = require('./base64');
var base64_encode = base64.encode;

assert.equal(base64_encode(new Buffer("a")), "YQ==");
assert.equal(base64_encode(new Buffer("aa")), "YWE=");
assert.equal(base64_encode(new Buffer("aaa")), "YWFh");
assert.equal(base64_encode(new Buffer("aaaa")), "YWFhYQ==");
assert.equal(base64_encode(new Buffer("abc")), "YWJj");
assert.equal(base64_encode(new Buffer("1234567890")), "MTIzNDU2Nzg5MA==");

assert.equal(base64_encode(new Buffer("abc"), 1, 2), "Yg==");
assert.equal(base64_encode(new Buffer("abc"), 1, 3), "YmM=");
assert.equal(base64_encode(new Buffer("abc"), 1, 7), "YmM=");
assert.equal(base64_encode(new Buffer("abc"), -1, 7), "YWJj");
