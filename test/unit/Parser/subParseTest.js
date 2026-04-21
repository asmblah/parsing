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
    Parser = require('../../../src/Parser');

describe('Parser grammar subParse (re-entrant parsing)', function () {
    describe('processor subParse', function () {
        it('should allow a processor to re-parse a substring and incorporate the result', function () {
            var grammarSpec = {
                    rules: {
                        'word': {
                            components: [{name: 'text', what: /[a-z]+/}]
                        },
                        'phrase': {
                            components: [{name: 'main', rule: 'word'}],
                            processor: function (node, parse) {
                                var extra = parse('suffix', {}, 'word');

                                return {
                                    name: 'phrase',
                                    main: node.main,
                                    extra: extra ? extra.text : null
                                };
                            }
                        }
                    },
                    start: 'phrase'
                },
                parser = new Parser(grammarSpec);

            expect(parser.parse('hello')).to.deep.equal({
                name: 'phrase',
                main: {name: 'word', text: 'hello'},
                extra: 'suffix'
            });
        });

        it('should leave the matchCacheStack empty after the parse completes', function () {
            var grammarSpec = {
                    rules: {
                        'word': {
                            components: [{name: 'text', what: /[a-z]+/}]
                        },
                        'phrase': {
                            components: [{name: 'main', rule: 'word'}],
                            processor: function (node, parse) {
                                parse('bonus', {}, 'word');
                                return node;
                            }
                        }
                    },
                    start: 'phrase'
                },
                parser = new Parser(grammarSpec);

            parser.parse('hello');

            // Every .pushMatchCaches() must have a matching .popMatchCaches().
            expect(parser.getMatchCacheStack()).to.deep.equal([]);
        });

        it('should allow multiple successive top-level parses after processors have used subParse', function () {
            var grammarSpec = {
                    rules: {
                        'word': {
                            components: [{name: 'text', what: /[a-z]+/}]
                        },
                        'phrase': {
                            components: [{name: 'main', rule: 'word'}],
                            processor: function (node, parse) {
                                var extra = parse('tag', {}, 'word');
                                return {name: 'phrase', main: node.main, tag: extra ? extra.text : null};
                            }
                        }
                    },
                    start: 'phrase'
                },
                parser = new Parser(grammarSpec);

            // First parse must not leave stale stack state that corrupts the second.
            expect(parser.parse('alpha')).to.deep.equal({name: 'phrase', main: {name: 'word', text: 'alpha'}, tag: 'tag'});
            expect(parser.parse('beta')).to.deep.equal({name: 'phrase', main: {name: 'word', text: 'beta'}, tag: 'tag'});
        });
    });

    describe('modifier subParse', function () {
        it('should allow a modifier to re-parse a substring and incorporate the result', function () {
            var grammarSpec = {
                    rules: {
                        'word': {
                            components: [{name: 'text', what: /[a-z]+/}]
                        },
                        'phrase': {
                            components: [{
                                name: 'main',
                                rule: 'word',
                                modifier: function (capture, parse) {
                                    var extra = parse('suffix', {}, 'word');
                                    return Object.assign({}, capture, {
                                        extra: extra ? extra.text : null
                                    });
                                }
                            }]
                        }
                    },
                    start: 'phrase'
                },
                parser = new Parser(grammarSpec);

            expect(parser.parse('hello')).to.deep.equal({
                name: 'phrase',
                main: {name: 'word', text: 'hello', extra: 'suffix'}
            });
        });

        it('should leave the matchCacheStack empty after the parse completes', function () {
            var grammarSpec = {
                    rules: {
                        'word': {
                            components: [{name: 'text', what: /[a-z]+/}]
                        },
                        'phrase': {
                            components: [{
                                name: 'main',
                                rule: 'word',
                                modifier: function (capture, parse) {
                                    parse('bonus', {}, 'word');
                                    return capture;
                                }
                            }]
                        }
                    },
                    start: 'phrase'
                },
                parser = new Parser(grammarSpec);

            parser.parse('hello');

            expect(parser.getMatchCacheStack()).to.deep.equal([]);
        });
    });
});
