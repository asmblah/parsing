/*
 * Parsing - JSON grammar-based parser
 * Copyright (c) Dan Phillimore (asmblah)
 * http://asmblah.github.com/parsing/
 *
 * Released under the MIT license
 * https://github.com/asmblah/parsing/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    findLastNewlineFrom = require('../../src/findLastNewlineFrom'),
    expect = require('chai').expect;

describe('findLastNewlineFrom()', function () {
    _.each({
        'the empty string': {
            text: '',
            offset: 0,
            expectedLastNewlineOffset: 0
        },
        'mid-way along a single line': {
            text: 'my text here',
            offset: 6,
            expectedLastNewlineOffset: 0
        },
        'mid-way along the third line with LF line endings': {
            text: 'first\nsecond\nand third',
            offset: 18,
            expectedLastNewlineOffset: 13 // Offset should be just _after_ the newline sequence
        },
        'mid-way along the third line with CRLF line endings': {
            text: 'first\r\nsecond\r\nand third',
            offset: 18,
            expectedLastNewlineOffset: 15 // Offset should be just _after_ the newline sequence
        }
    }, function (scenario, description) {
        it('should return the correct newline count for ' + description, function () {
            expect(findLastNewlineFrom(scenario.text)).to.equal(scenario.expectedLastNewlineOffset);
        });
    });
});
