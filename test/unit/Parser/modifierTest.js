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

// Note that these are not the same as Processors, which operate on a Rule's root Component
describe('Parser grammar component match modifier', function () {
    it('should support "what" component modifiers overriding the capture', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: [{
                            name: 'my_capture',
                            what: /my\s+\w+/,
                            modifier: function (capture) {
                                // Override the captured string
                                return '[my prefix]' + capture + '[my suffix]';
                            }
                        }]
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
            code = '  my\n text  ';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            my_capture: '[my prefix]my\n text[my suffix]',
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

    it('should support "what" component modifiers reentering the parser', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: [{
                            name: 'my_capture',
                            what: /my\s+\w+/,
                            modifier: function (capture, parse) {
                                return capture === 'my\n text' ?
                                    // Reenter the parser, parsing an entirely different string,
                                    // and use its result as the result of this component's match
                                    parse('      my \n\n   differenttext  ') :
                                    capture;
                            }
                        }]
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
            code = '  my\n text  ';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            // Note this capture was modified by the modifier
            my_capture: {
                name: 'my_rule',
                my_capture: 'my \n\n   differenttext',
                my_bounds: {
                    start: {
                        offset: 6,
                        line: 1,
                        column: 7
                    },
                    end: {
                        offset: 27,
                        line: 3,
                        column: 17
                    }
                }
            },
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

    it('should support "what" component modifiers failing the parse', function () {
        var caughtError,
            grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: [{
                            name: 'my_capture',
                            what: /my\s+\w+/,
                            modifier: function (capture, parse, fail) {
                                fail('My failure message', {my: 'context'});
                            }
                        }]
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
            code = '\n\n  my\n text  ';

        try {
            parser.parse(code);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).to.be.an.instanceOf(ParseException);
        expect(caughtError.getMessage()).to.equal('My failure message');
        expect(caughtError.getContext()).to.deep.equal({my: 'context'});
        // Note that the whitespace before the match _was_ consumed first
        expect(caughtError.getStartOffset()).to.equal(4);
        // Note that the whitespace after the match was not consumed, as the failure
        // was explicitly raised in the modifier callback
        expect(caughtError.getEndOffset()).to.equal(12);
        expect(caughtError.getStartLineNumber()).to.equal(3);
        expect(caughtError.getEndLineNumber()).to.equal(4);
        expect(caughtError.getText()).to.equal(code);
        expect(caughtError.unexpectedEndOfInput()).to.be.false;
    });
});
