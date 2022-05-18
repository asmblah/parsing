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
});
