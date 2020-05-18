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
    countNewlines = require('../../src/countNewlines'),
    expect = require('chai').expect;

describe('countNewlines()', function () {
    _.each({
        'the empty string': {
            text: '',
            expectedNewlines: 0
        },
        'a blank line followed by text on the next line': {
            text: '\nabc',
            expectedNewlines: 1
        },
        'three lines of equal length': {
            text: 'abc\ndef\nghi',
            expectedNewlines: 2
        },
        'three blank lines followed by text on the next line': {
            text: '\n\n\nmememe',
            expectedNewlines: 3
        }
    }, function (scenario, description) {
        it('should return the correct newline count for ' + description, function () {
            expect(countNewlines(scenario.text)).to.equal(scenario.expectedNewlines);
        });
    });
});
