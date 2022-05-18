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
    ParseException = require('../../../../src/Exception/Parse'),
    Parser = require('../../../../src/Parser');

describe('Parser grammar rule match processor abort', function () {
    it('should throw a ParseException when there is no custom ErrorHandler specified', function () {
        var caughtError,
            grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_program': {
                        components: {
                            oneOrMoreOf: {oneOf: ['my_first_statement', 'my_second_statement']}
                        }
                    },
                    'my_first_statement': {
                        components: [{name: 'text', what: /first/}],
                        processor: function (node, parse, abort) {
                            abort('My abort message', {my: 'context'});
                        }
                    },
                    'my_second_statement': {
                        components: [{name: 'text', what: /second/}]
                    },
                    'whitespace': /\s+/,
                },
                start: 'my_program',
                bounds: 'my_bounds'
            },
            parser = new Parser(grammarSpec),
            code = '  first \n\nbut not immediately second';

        try {
            parser.parse(code);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).to.be.an.instanceOf(ParseException);
        expect(caughtError.getMessage()).to.equal('My abort message');
        expect(caughtError.getContext()).to.deep.equal({my: 'context'});
        expect(caughtError.getStartOffset()).to.equal(2);
        expect(caughtError.getStartLineNumber()).to.equal(1);
        // Note that the whitespace after the match was not consumed, as the abort
        // was explicitly raised in the processor callback.
        expect(caughtError.getEndOffset()).to.equal(7);
        expect(caughtError.getEndLineNumber()).to.equal(1);
        expect(caughtError.getText()).to.equal(code);
        expect(caughtError.unexpectedEndOfInput()).to.be.false;
    });

    it('should invoke the custom ErrorHandler when provided', function () {
        var State = (function () {
                function State() {
                }

                // State classes can define arbitrary APIs, there is none expected.
                State.prototype.getMyValue = function () {
                    return 21;
                };

                return State;
            }()),
            ErrorHandler = (function () {
                function ErrorHandler(stderr, state) {
                    this.state = state;
                    this.stderr = stderr;
                }

                ErrorHandler.prototype.handle = function (parseException) {
                    return {
                        // Call the method on the instance of our custom State class.
                        myValue: this.state.getMyValue(),

                        // Pass the ParseException & Stderr back for inspection.
                        parseException: parseException,
                        stderr: this.stderr
                    };
                };

                return ErrorHandler;
            }()),
            grammarSpec = {
                State: State,
                ErrorHandler: ErrorHandler,
                ignore: 'whitespace',
                rules: {
                    'my_program': {
                        components: {
                            oneOrMoreOf: {oneOf: ['my_first_statement', 'my_second_statement']}
                        }
                    },
                    'my_first_statement': {
                        components: [{name: 'text', what: /first/}],
                        processor: function (node, parse, abort) {
                            abort('My abort message', {my: 'context'});
                        }
                    },
                    'my_second_statement': {
                        components: [{name: 'text', what: /second/}]
                    },
                    'whitespace': /\s+/,
                },
                start: 'my_program',
                bounds: 'my_bounds'
            },
            stderr = {my: 'fake stderr'},
            parser = new Parser(grammarSpec, stderr),
            code = '\n\n  first \n\nbut not immediately second',
            result;

        result = parser.parse(code);

        expect(result.myValue).to.equal(21);
        expect(result.stderr).to.equal(stderr);
        expect(result.parseException).to.be.an.instanceOf(ParseException);
        expect(result.parseException.getMessage()).to.equal('My abort message');
        expect(result.parseException.getContext()).to.deep.equal({my: 'context'});
        // Note that the whitespace before the match _was_ consumed first.
        expect(result.parseException.getStartOffset()).to.equal(4);
        expect(result.parseException.getStartLineNumber()).to.equal(3);
        // Note that the whitespace after the match was not consumed, as the abort
        // was explicitly raised in the processor callback.
        expect(result.parseException.getEndOffset()).to.equal(9);
        expect(result.parseException.getEndLineNumber()).to.equal(3);
        expect(result.parseException.getText()).to.equal(code);
        expect(result.parseException.unexpectedEndOfInput()).to.be.false;
    });
});
