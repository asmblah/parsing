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
describe('Parser grammar component match modifier basic', function () {
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

    it('should support "rule" component modifiers overriding the capture of another rule to a miss', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'your_rule': {
                        components: [{
                            name: 'your_capture',
                            what: /my\s+\w+/
                        }]
                    },
                    'my_rule': {
                        components: [{
                            oneOf: [{
                                name: 'my_capture',
                                rule: 'your_rule',
                                modifier: function () {
                                    // Discard this match, but the your_rule match will still be cached.
                                    return null;
                                }
                            }, {
                                name: 'my_capture',
                                rule: 'your_rule',
                                modifier: function (capture) {
                                    // Override the captured string.
                                    return '[my prefix]' + capture.your_capture + '[my suffix]';
                                }
                            }]
                        }]
                    },
                    'whitespace': /\s+/,
                },
                start: 'my_rule'
            },
            parser = new Parser(grammarSpec),
            code = '  my\n text  ';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            my_capture: '[my prefix]my\n text[my suffix]'
        });
    });

    it('should support "rule" component modifiers overriding the capture of another rule to a new value', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'their_rule': {
                        components: [{
                            name: 'their_capture',
                            what: /my\s+\w+/
                        }]
                    },
                    'your_rule': {
                        components: [{
                            name: 'your_capture',
                            rule: 'their_rule',
                            modifier: function () {
                                return {name: 'synthetic_capture'};
                            }
                        }]
                    },
                    'my_rule': {
                        components: [{
                            oneOf: [{
                                name: 'my_capture',
                                rule: 'your_rule',
                                modifier: function () {
                                    return null;
                                }
                            }, {
                                name: 'my_capture',
                                rule: 'their_rule',
                                modifier: function (capture) {
                                    // Override the captured string.
                                    return '[my prefix]' + capture.their_capture + '[my suffix]';
                                }
                            }]
                        }]
                    },
                    'whitespace': /\s+/,
                },
                start: 'my_rule'
            },
            parser = new Parser(grammarSpec),
            code = '  my\n text  ';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            my_capture: '[my prefix]my\n text[my suffix]'
        });
    });
});
