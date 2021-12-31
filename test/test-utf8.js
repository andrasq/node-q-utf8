/**
 * Copyright (C) 2016-2020 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var assert = require('assert');
var util = require('util');

// allocBuf and fromBuf from qibl 1.4.0
var allocBuf = eval('parseInt(process.versions.node) >= 6 ? Buffer.allocUnsafe : Buffer');
var fromBuf = eval('parseInt(process.versions.node) >= 6 ? Buffer.from : Buffer');

var sysbuf = fromBuf([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
var testbuf = fromBuf([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);

var utf8 = require('../utf8.js');

function makeTestStrings(chr1) {
    var chr2 = String.fromCharCode(i ^ 1);
    var chr3 = String.fromCharCode(0x101);
    var chr4 = String.fromCharCode(0x1001);
    var chrS = String.fromCharCode(chr1.charCodeAt(0) + 1024);
    return [
        chr1,                    // only char
        "ab" + chr1,             // last
        chr1 + "bc",             // first
        "a" + chr1 + "bc",       // middle
        "a" + chr1 + chr2 + "bc",  // adjacent
        "a" + chr1 + chr3 + "bc",  // adjacent to 2-byte
        "a" + chr1 + chr4 + "bc",  // adjacent to 3-byte
        chr1 + chrS,            // make a surrogate pair or two invalid chars
        "a" + chr1 + chrS + "bc",
    ];
}

for (var i=0; i<=0xFFFF; i+=(i<128 ? 1 : 0x10)) {
    var chr1 = String.fromCharCode(i);
    var strings = makeTestStrings(chr1);

    // encodeUtf8 should convert all chars the same as Buffer.write
    for (var j=0; j<strings.length; j++) {
        sysbuf.write(strings[j], 0);
        utf8.encodeUtf8(strings[j], 0, strings[j].length, testbuf, 0);
        assert.deepEqual(testbuf, sysbuf);
    }

    // stringLength should correctly count multi-byte utf8 characters
    for (var j=0; j<strings.length; j++) {
        var len = sysbuf.write(strings[j], 0);
        var got = utf8.stringLength(sysbuf, 0, len, 'utf8');
        assert.equal(got, strings[j].length, 'mismatch on length: ' + got + ' != ' + len + '; '
            + strings[j] + ' => ' + util.inspect(sysbuf.slice(0, len)));
    }

    // decodeUtf8 should recover the same string as Buffer.toString
    for (var j=0; j<strings.length; j++) {
        var len = sysbuf.write(strings[j], 0);
        var str = sysbuf.toString('utf8', 0, len);
        var utf = utf8.decodeUtf8(sysbuf, 0, len);
        assert.equal(utf, str, 'mismatch on string ' + j + ': ' + util.inspect(sysbuf.slice(0, len)));
    }

    // byteLength should count the number of bytes required for the substring
    for (var j=0; j<strings.length; j++) {
        assert.equal(utf8.byteLength(strings[j], 0, strings[j].length), Buffer.byteLength(strings[j]));
        assert.equal(utf8.byteLength(strings[j], 1, strings[j].length), Buffer.byteLength(strings[j].slice(1)));
        assert.equal(utf8.byteLength(strings[j], 0, strings[j].length-1), Buffer.byteLength(strings[j].slice(0, -1)));
    }

    // encodeJson should write same strings as JSON
    // Note that encodeJson does not surround the output in "..." quotes
    // code points D800..DFFF are not valid utf8 (reserved for surrogate pairs), and all become codepoint FFFD
    for (var j=0; j<strings.length; j++) {
        var nb = utf8.encodeJson(strings[j], 0, strings[j].length, testbuf, 0);
        var got = testbuf.toString('utf8', 0, nb);
        nb = sysbuf.write(JSON.stringify(strings[j]).slice(1, -1)); // system json encode, strip wrapping "..." quotes
        var expect = sysbuf.toString('utf8', 0, nb);
        if (got !== expect) {
            process.stdout.write('x');
            console.log("AR: mismatch on char %s combo %d: got %s vs expected %s", i.toString(16), j, stringBytes(got), stringBytes(expect));
        }
        assert.deepEqual(testbuf, sysbuf, j + ": error on: " + strings[j]);
    }
}

function stringBytes(str) {
    var codes = [];
    for (var i=0; i<str.length; i++) codes.push(pad2x(str.charCodeAt(i)));
    return codes.join(' ');
}
function pad2x(ch) { return ch < 16 ? '0' + ch.toString(16) : ch.toString(16) }

function compareStrings( i, s1, s2 ) {
    if (isNaN(s1) && isNaN(s2)) {
        return true;
    }
    if (s1.length !== s2.length) {
        console.log("mismatched length");
        return false;
    }
    for (var j=0; j<s1.length; j++) if (s1.charCodeAt(j) !== s2.charCodeAt(j)) {
        console.log("charcode %i: mismatch at %d: %d vs %d; (%s) :: (%s)", i, j, s1.charCodeAt(i), s2.charCodeAt(i), s1, s2);
        return false;
    }
    return true;
}

module.exports = {
    'scanStringZ': {
        'should scan valid utf8': function(t) {
            var testbuf = allocBuf(100);
            var tests = [
                [ "", "" ],
                [ "abc", "abc" ],
                [ "(\u1234)", "(\u1234)" ],
                [ "\uD800", "\uFFFD" ],
                [ "\uDC00", "\uFFFD" ],
                [ "\uDFFF", "\uFFFD" ],
                [ "\uE000", "\uE000" ],
            ];

            for (var i=0; i<tests.length; i++) {
                var nb = testbuf.write(tests[i][0]);
                testbuf[nb] = 0;
                var entity = { val: '', end: 0 };
                var next = utf8.scanStringZUtf8(testbuf, 0, entity);
                t.equal(entity.val, tests[i][1]);
                t.equal(entity.end, nb);
                t.equal(next, nb + 1);
            }

            t.done();
        },

        'should scan bad utf8': function(t) {
            var tests = [
                [ [0], "" ],
            ];

            for (var i=0; i<tests.length; i++) {
                var testbuf = fromBuf(tests[i][0]);
                var entity = { val: '', end: 0 };
                var next = utf8.scanStringZUtf8(testbuf, 0, entity);
                t.equal(entity.val, tests[i][1]);
                t.equal(entity.end, tests[i][0].length - 1);
                t.equal(next, tests[i][0].length);
            }

            t.done();
        },

        'should stop on end of buffer': function(t) {
//t.skip();
            var entity = { val: 0, end: 0 };
            utf8.scanStringZUtf8([65, 65, 65], 1, entity);
            t.equal(entity.val, 'AA');
            t.equal(entity.end, 3);
            t.done();
        },

        'decode speed 8-ch string': function(t) {
            var testbuf = fromBuf("Hello, w\x00");
            var x;
            var entity = { val: 0, end: 0 };
            for (var i=0; i<1000000; i++) x = utf8.scanStringZUtf8(testbuf, 0, entity);
            // 12m/s ...but 7m/s if previous test ran off the end of the array??
            // for (var i=0; i<1000000; i++) x = testbuf.toString('utf8', 0, 8);
            // 10m/s
            t.done();
        },

        'decode speed 16-ch string': function(t) {
            var testbuf = fromBuf("Hello, wHello, w\x00");
            var x;
            var entity = { val: 0, end: 0 };
            for (var i=0; i<1000000; i++) x = utf8.scanStringZUtf8(testbuf, 0, entity);
            // 6.7m/s
            // for (var i=0; i<1000000; i++) x = testbuf.toString('utf8', 0, 8);
            // 10m/s
            t.done();
        },
    },
}
