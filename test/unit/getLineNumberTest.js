/*
 * Parsing - JSON grammar-based parser
 * Copyright (c) Dan Phillimore (asmblah)
 * http://asmblah.github.com/parsing/
 *
 * Released under the MIT license
 * https://github.com/asmblah/parsing/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('lodash'),
    expect = require('chai').expect,
    getLineNumber = require('../../src/getLineNumber');

describe('getLineNumber()', function () {
    _.each({
        'the empty string': {
            text: '',
            offset: 0,
            expectedLineNumber: 1
        },
        'a blank line followed by text on the next line': {
            text: '\nabc',
            offset: 0,
            expectedLineNumber: 1
        },
        'a blank line also followed by text on the next line': {
            text: '\ndef',
            offset: 2,
            expectedLineNumber: 2
        },
        'three blank lines followed by text on the next line': {
            text: '\n\n\nmememe',
            offset: 3,
            expectedLineNumber: 4
        }
    }, function (scenario, description) {
        it('should return the correct line number for ' + description + ', offset ' + scenario.offset, function () {
            expect(getLineNumber(scenario.text, scenario.offset)).to.equal(scenario.expectedLineNumber);
        });
    });
});