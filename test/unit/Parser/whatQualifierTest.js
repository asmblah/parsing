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
    ParseException = require('../../../src/Exception/Parse'),
    Parser = require('../../../src/Parser');

describe('Parser "what" qualifier', function () {
    describe('regex matching', function () {
        it('should only match the pattern at the current parse position, not later in the string', function () {
            // Verifies that regexes are anchored to the current position (via the sticky flag).
            // Without anchoring, /world/ would match somewhere inside 'hello world' even when
            // the parser is positioned at offset 0.
            var caughtError,
                grammarSpec = {
                    rules: {
                        'my_rule': {
                            components: [{name: 'my_capture', what: /world/}]
                        }
                    },
                    start: 'my_rule'
                },
                parser = new Parser(grammarSpec);

            try {
                parser.parse('hello world');
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).to.be.an.instanceOf(ParseException);
            expect(caughtError.getMessage()).to.equal('Parser.parse() :: No match');
            expect(caughtError.getContext()).to.deep.equal({});
            expect(caughtError.getStartOffset()).to.equal(-1);
            expect(caughtError.getEndOffset()).to.equal(-1);
            expect(caughtError.getStartLineNumber()).to.equal(-1);
            expect(caughtError.getEndLineNumber()).to.equal(-1);
            expect(caughtError.getText()).to.equal('hello world');
            expect(caughtError.unexpectedEndOfInput()).to.be.false;
        });

        it('should match the pattern at the current position when it is not at offset zero', function () {
            // Verifies that anchoring uses the current offset, not always the start of the string.
            var grammarSpec = {
                    ignore: 'whitespace',
                    rules: {
                        'my_rule': {
                            components: [
                                {name: 'first', what: /hello/},
                                {name: 'second', what: /world/}
                            ]
                        },
                        'whitespace': /\s+/
                    },
                    start: 'my_rule'
                },
                parser = new Parser(grammarSpec);

            expect(parser.parse('hello world')).to.deep.equal({
                name: 'my_rule',
                first: 'hello',
                second: 'world'
            });
        });

        it('should match a regex with the case-insensitive flag', function () {
            var grammarSpec = {
                    rules: {
                        'my_rule': {
                            components: [{name: 'my_capture', what: /HELLO/i}]
                        }
                    },
                    start: 'my_rule'
                },
                parser = new Parser(grammarSpec);

            expect(parser.parse('hello')).to.deep.equal({
                name: 'my_rule',
                my_capture: 'hello'
            });
        });

        it('should match a regex containing a capture group via captureIndex', function () {
            var grammarSpec = {
                    rules: {
                        'my_rule': {
                            components: [{
                                name: 'my_capture',
                                what: /\[(\w+)\]/,
                                captureIndex: 1
                            }]
                        }
                    },
                    start: 'my_rule'
                },
                parser = new Parser(grammarSpec);

            expect(parser.parse('[hello]')).to.deep.equal({
                name: 'my_rule',
                my_capture: 'hello'
            });
        });

        it('should treat a leading ^ in a grammar regex as equivalent to no anchor', function () {
            var grammarSpec = {
                    ignore: 'whitespace',
                    rules: {
                        'my_rule': {
                            components: [
                                {name: 'first', what: /hello/},
                                {name: 'second', what: /^world/}
                            ]
                        },
                        'whitespace': /\s+/
                    },
                    start: 'my_rule'
                },
                parser = new Parser(grammarSpec);

            expect(parser.parse('hello world')).to.deep.equal({
                name: 'my_rule',
                first: 'hello',
                second: 'world'
            });
        });
    });

    it('should support capturing bounds for every AST node', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_other_rule': {
                        components: {name: 'my_other_capture', what: /my\n\n \w+/}
                    },
                    'my_rule': {
                        components: [
                            // Use a regex as the "what"
                            {name: 'first_capture', what: /my\n\n \w+/},
                            // Use another rule name as the "what"
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
            first_capture: 'my\n\n stuff',
            second_capture: {
                name: 'my_other_rule',
                my_other_capture: 'my\n\n things',

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
