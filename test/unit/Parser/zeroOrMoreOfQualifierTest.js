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

describe('Parser "zeroOrMoreOf" qualifier', function () {
    it('should support capturing bounds for every AST node with a single rule', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: [
                            {name: 'first_capture', zeroOrMoreOf: {what: /my\n \w+/}},
                            {name: 'second_capture', zeroOrMoreOf: {what: /your\n \w+/}}
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
            code = '  my\n first my\n second  ';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            // Two occurrences
            first_capture: ['my\n first', 'my\n second'],
            // Second capture did not match anything, but that's fine as we're allowing zero occurrences
            second_capture: [],
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
});
