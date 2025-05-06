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
describe('Parser grammar component match modifier cache handling', function () {
    it('should allow modifiers to safely modify the passed capture when it is a rule match', function () {
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
                            modifier: function (capture) {
                                // Attempt to modify the cached match of their_rule.
                                capture.their_capture = 'modified';

                                return capture;
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
