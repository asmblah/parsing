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
describe('Parser grammar rule match processor cache handling', function () {
    it('should give processors a frozen snapshot so that returning a modified copy does not corrupt child rule caches', function () {
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
                        processor: function (node) {
                            // Return a NEW object with a modified their_capture instead of
                            // mutating node.your_capture in place (which would throw because
                            // node is frozen).
                            return {
                                name: node.name,
                                your_capture: Object.assign({}, node.your_capture, {
                                    their_capture: 'modified'
                                })
                            };
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

        // their_rule's cache must not be corrupted by your_rule's processor:
        // the modifier for their_rule should still see the original 'my\n text'.
        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            my_capture: '[my prefix]my\n text[my suffix]'
        });
    });

    it('should throw when a processor attempts to mutate the frozen input', function () {
        var grammarSpec = {
                rules: {
                    'my_rule': {
                        components: [{name: 'val', what: /\w+/}],
                        processor: function (node) {
                            node.val = 'mutated'; // Must throw — node is frozen.
                            return node;
                        }
                    }
                },
                start: 'my_rule'
            },
            parser = new Parser(grammarSpec);

        expect(function () {
            parser.parse('hello');
        }).to.throw(
            TypeError,
            'Cannot assign to read only property \'val\''
        );
    });
});
