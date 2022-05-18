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

// Note that these are not the same as Processors, which operate on a Rule's root Component
describe('Parser grammar component match modifier fail', function () {
    it('should be able to fail a component match', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_program': {
                        components: {
                            name: 'statements',
                            oneOrMoreOf: 'my_statement'
                        }
                    },
                    'my_statement': {
                        components: [
                            {
                                oneOf: [
                                    {
                                        name: 'first_text',
                                        what: /hello/,
                                        modifier: function (capture, parse, abort, context) {
                                            var ignore = context.ignoreMyFirst;

                                            // Fail this component every other time, causing second_text to match instead.
                                            context.ignoreMyFirst = !context.ignoreMyFirst;

                                            // Returning null from a modifier fails the component's match.
                                            return ignore ? null : capture;
                                        }
                                    },
                                    {
                                        name: 'second_text',
                                        what: /hello/
                                    }
                                ]
                            }
                        ]
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
                    'name': 'my_statement',
                    'first_text': 'hello'
                },
                {
                    'name': 'my_statement',
                    'second_text': 'hello'
                },
                {
                    'name': 'my_statement',
                    'first_text': 'hello'
                },
                {
                    'name': 'my_statement',
                    'second_text': 'hello'
                }
            ]
        });
    });
});
