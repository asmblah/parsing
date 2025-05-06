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

// Note that these are not the same as Modifiers, which operate on Components.
describe('Parser grammar rule match processor basic', function () {
    it('should support a simple example with only one grammar rule', function () {
        var grammarSpec = {
                rules: {
                    'number': {
                        name: 'value',
                        what: /\d+/,
                        processor: function (match) {
                            return {
                                name: 'custom',
                                value: 'before ' + match.value + ' after'
                            };
                        }
                    }
                },
                start: 'number'
            },
            parser = new Parser(grammarSpec),
            code = '128';

        expect(parser.parse(code)).to.deep.equal({
            name: 'custom',
            value: 'before 128 after'
        });
    });

    it('should support rules matching twice due to alternation', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    whitespace: /\s+/,

                    do: {
                        components: [
                            /do/,
                            /\(/,
                            {
                                name: 'value',
                                what: [/\d+/]
                            },
                            /\)/
                        ],
                        processor: function (match) {
                            return {
                                name: 'custom',
                                value: 'before ' + match.value + ' after'
                            };
                        }
                    },

                    // A rule that will invoke the `do` rule but never fully match.
                    wont_match: ['do', /wont_match/],

                    // A rule that will invoke the `do` rule and then fully match.
                    will_match: ['do', /done/],

                    full_command: {
                        // Try `wont_match` first, to check that when it fails to fully match
                        // its state doesn't corrupt the `will_match` attempt.
                        oneOf: ['wont_match', 'will_match']
                    }
                },
                start: 'full_command'
            },
            parser = new Parser(grammarSpec),
            code = 'do(21) done';

        expect(parser.parse(code)).to.deep.equal({
            name: 'custom',
            value: 'before 21 after'
        });
    });

    it('should support processors modifying the capture of another rule to a miss', function () {
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
                            rule: 'their_rule'
                        }],
                        processor: function () {
                            // Discard this match, but the their_rule match will still be cached.
                            return null;
                        }
                    },
                    'my_rule': {
                        components: [{
                            oneOf: [{
                                name: 'my_capture',
                                rule: 'your_rule'
                            }, {
                                name: 'my_capture',
                                rule: 'their_rule'
                            }]
                        }],
                        processor: function (node) {
                            // Override the captured string.
                            node.my_capture = '[my prefix]' + node.my_capture.their_capture + '[my suffix]';

                            return node;
                        }
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

    it('should support processors overriding the capture of another rule to a new value', function () {
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
                            rule: 'their_rule'
                        }],
                        processor: function () {
                            return {name: 'synthetic_capture'};
                        }
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
