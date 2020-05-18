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

describe('Parser "rule" qualifier', function () {
    it('should support capturing bounds for every AST node with both explicit and implicit rule qualifiers', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_other_rule': {
                        components: {name: 'my_text', what: /my\n\n \w+/}
                    },
                    'my_rule': {
                        components: [
                            // Explicitly use a "rule" qualifier
                            {name: 'first_capture', rule: 'my_other_rule'},
                            // Implicitly use a "rule" qualifier via the generic "what" qualifier
                            {name: 'second_capture', what: 'my_other_rule'}
                        ]
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
            code = '   my\n\n stuff my\n\n things  ';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            first_capture: {
                name: 'my_other_rule',
                my_text: 'my\n\n stuff',

                my_bounds: {
                    start: {
                        offset: 3,
                        line: 1,
                        column: 4
                    },
                    end: {
                        offset: 13,
                        line: 3,
                        column: 7
                    }
                }
            },
            second_capture: {
                name: 'my_other_rule',
                my_text: 'my\n\n things',

                my_bounds: {
                    start: {
                        offset: 14,
                        line: 3,
                        column: 8
                    },
                    end: {
                        offset: 25,
                        line: 5,
                        column: 8
                    }
                }
            },
            my_bounds: {
                start: {
                    offset: 3,
                    line: 1,
                    column: 4
                },
                end: {
                    offset: 25,
                    line: 5,
                    column: 8
                }
            }
        });
    });
});
