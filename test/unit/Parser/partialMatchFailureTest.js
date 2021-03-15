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

describe('Parser partial match failures', function () {
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
                        components: [{name: 'text', what: /first/}]
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
        expect(caughtError.getMessage()).to.equal('Parser.parse() :: Unexpected "b"');
        // Note that the whitespace before the match _was_ consumed first
        expect(caughtError.getStartOffset()).to.equal(2);
        expect(caughtError.getEndOffset()).to.equal(10);
        expect(caughtError.getEndLineNumber()).to.equal(3);
        expect(caughtError.getText()).to.equal(code);
        expect(caughtError.unexpectedEndOfInput()).to.be.false;
    });

    it('should invoke the custom ErrorHandler when provided', function () {
        var State = (function () {
                function State() {
                }

                // State classes can define arbitrary APIs, there is none expected
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
                        // Call the method on the instance of our custom State class
                        myValue: this.state.getMyValue(),

                        // Pass the ParseException & Stderr back for inspection
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
                        components: [{name: 'text', what: /first/}]
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
            code = '   first \n\nbut not immediately second',
            result;

        result = parser.parse(code);

        expect(result.myValue).to.equal(21);
        expect(result.stderr).to.equal(stderr);
        expect(result.parseException).to.be.an.instanceOf(ParseException);
        expect(result.parseException.getMessage()).to.equal('Parser.parse() :: Unexpected "b"');
        // Note that the whitespace before the match _was_ consumed first
        expect(result.parseException.getStartOffset()).to.equal(3);
        expect(result.parseException.getEndOffset()).to.equal(11);
        expect(result.parseException.getEndLineNumber()).to.equal(3);
        expect(result.parseException.getText()).to.equal(code);
        expect(result.parseException.unexpectedEndOfInput()).to.be.false;
    });
});
