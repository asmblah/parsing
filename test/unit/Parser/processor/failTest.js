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
    Parser = require('../../../../src/Parser');

describe('Parser grammar rule match processor fail', function () {
    it('should be able to fail a component match', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_program': {
                        components: {
                            name: 'statements',
                            oneOrMoreOf: {oneOf: ['my_first_statement', 'my_second_statement']}
                        }
                    },
                    'my_first_statement': {
                        components: [{name: 'text', what: /hello/}],
                        processor: function (node, parse, abort, context) {
                            var ignore = context.ignoreMyFirst;

                            // Fail this rule every other time, causing my_second_statement to match instead.
                            context.ignoreMyFirst = !context.ignoreMyFirst;

                            // Returning null from a processor fails the component's match.
                            return ignore ? null : node;
                        }
                    },
                    'my_second_statement': {
                        components: [{name: 'text', what: /hello/}]
                    },
                    'whitespace': /\s+/,
                },
                start: 'my_program'
            },
            parser = new Parser(grammarSpec, null, {
                context: {
                    ignoreMyFirst: false
                }
            }),
            code = ' hello hello hello hello ';

        expect(parser.parse(code)).to.deep.equal({
            'name': 'my_program',
            'statements': [
                {
                    'name': 'my_first_statement',
                    'text': 'hello'
                },
                {
                    'name': 'my_second_statement',
                    'text': 'hello'
                },
                {
                    'name': 'my_first_statement',
                    'text': 'hello'
                },
                {
                    'name': 'my_second_statement',
                    'text': 'hello'
                }
            ]
        });
    });
});
