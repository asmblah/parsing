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

describe('Parser special End-Of-File <EOF> rule', function () {
    it('should support capturing bounds for every AST node with a single rule', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: [
                            {name: 'my_capture', what: [/my\s+\w+/, '<EOF>']}
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
            code = '  my\n text';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            my_capture: 'my\n text',
            my_bounds: {
                start: {
                    offset: 2,
                    line: 1,
                    column: 3
                },
                end: {
                    offset: 10,
                    line: 2,
                    column: 6
                }
            }
        });
    });
});
