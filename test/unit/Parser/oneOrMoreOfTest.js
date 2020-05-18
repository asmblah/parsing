/*
 * Parsing - JSON grammar-based parser
 * Copyright (c) Dan Phillimore (asmblah)
 * http://asmblah.github.com/parsing/
 *
 * Released under the MIT license
 * https://github.com/asmblah/parsing/raw/master/MIT-LICENSE.txt
 */

'use strict';

var expect = require('chai').expect,
    Parser = require('../../../src/Parser');

describe('Parser "oneOrMoreOf" qualifier', function () {
    it('should support capturing bounds for every AST node with a single rule', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: {name: 'my_capture', oneOrMoreOf: {what: /my\n \w+/}}
                    },
                    'whitespace': /\s+/,
                },
                start: 'my_rule',
                bounds: 'my_bounds'
            },
            options = {
                captureAllBounds: true
            },
            parser = new Parser(grammarSpec, null, options),
            code = '  my\n first my\n second  ';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            my_capture: ['my\n first', 'my\n second'],
            my_bounds: {
                start: {
                    offset: 2,
                    line: 1,
                    column: 3
                },
                end: {
                    offset: 22,
                    line: 3,
                    column: 8
                }
            }
        });
    });

    it('should fail the match when the qualifier does not match anything', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: {name: 'my_capture', oneOrMoreOf: {what: /my\n \w+/}}
                    },
                    'whitespace': /\s+/,
                },
                start: 'my_rule',
                bounds: 'my_bounds'
            },
            options = {
                captureAllBounds: true
            },
            parser = new Parser(grammarSpec, null, options),
            code = 'your\n first your\n second  ';

        try {
            parser.parse(code);
        } catch (error) {
            expect(error.message).to.equal('Parser.parse() :: Unexpected "y"');
            expect(error.getFurthestMatchEnd()).to.equal(-1);
            return;
        }

        throw new Error('Parse should have failed!');
    });
});
