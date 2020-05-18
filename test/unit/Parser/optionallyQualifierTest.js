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

describe('Parser "optionally" qualifier', function () {
    it('should support capturing bounds for every AST node', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_stuff': {
                        components: [{name: 'my', what: /my/}, {optionally: {name: 'stuff_word', what: /stuff/}}]
                    },
                    'my_rule': {
                        components: {name: 'my_capture', oneOrMoreOf: 'my_stuff'}
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
            code = '  my\n stuff my\n  ';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            my_capture: [
                {
                    name: 'my_stuff',
                    my: 'my',
                    stuff_word: 'stuff',

                    my_bounds: {
                        start: {
                            offset: 2,
                            line: 1,
                            column: 3
                        },
                        end: {
                            offset: 11,
                            line: 2,
                            column: 7
                        }
                    }
                },
                {
                    name: 'my_stuff',
                    my: 'my',
                    // NB: Note that "stuff_word" is not captured here at all as it was optional

                    my_bounds: {
                        start: {
                            offset: 12,
                            line: 2,
                            column: 8
                        },
                        end: {
                            offset: 14,
                            line: 2,
                            column: 10
                        }
                    }
                }
            ],
            my_bounds: {
                start: {
                    offset: 2,
                    line: 1,
                    column: 3
                },
                end: {
                    offset: 14,
                    line: 2,
                    column: 10
                }
            }
        });
    });
});
