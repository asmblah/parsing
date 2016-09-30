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
    expect = require('chai').expect,
    getColumnNumber = require('../../src/getColumnNumber');

describe('getColumnNumber()', function () {
    _.each({
        'the empty string': {
            text: '',
            offset: 0,
            expectedColumnNumber: 1
        },
        'a blank line followed by text on the next line': {
            text: '\nabc',
            offset: 0,
            expectedColumnNumber: 1
        },
        'a blank line also followed by text on the next line': {
            text: '\ndef',
            offset: 2,
            expectedColumnNumber: 2
        },
        'three blank lines followed by text on the next line': {
            text: '\n\n\nmememe',
            offset: 5,
            expectedColumnNumber: 3
        }
    }, function (scenario, description) {
        it('should return the correct column number for ' + description + ', offset ' + scenario.offset, function () {
            expect(getColumnNumber(scenario.text, scenario.offset)).to.equal(scenario.expectedColumnNumber);
        });
    });
});
