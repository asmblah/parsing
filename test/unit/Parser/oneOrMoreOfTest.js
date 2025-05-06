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

describe('Parser "oneOrMoreOf" qualifier', function () {
    it('should support capturing bounds for every AST node with a single rule', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: {name: 'my_capture', oneOrMoreOf: {what: /my\n \w+/}}
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
            code = '  my\n first my\n second  ';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            my_capture: ['my\n first', 'my\n second'],
            my_bounds: {
                start: {
                    offset: 2,
                    line: 1,
                    column: 3
                },
                end: {
                    offset: 22,
                    line: 3,
                    column: 8
                }
            }
        });
    });

    it('should fail the match when the qualifier does not match anything', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: {name: 'my_capture', oneOrMoreOf: {what: /my\n \w+/}}
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
            code = 'your\n first your\n second  ';

        try {
            parser.parse(code);
        } catch (error) {
            expect(error.message).to.equal('Parser.parse() :: No match');
            expect(error.getStartOffset()).to.equal(-1);
            expect(error.getEndOffset()).to.equal(-1);
            return;
        }

        throw new Error('Parse should have failed!');
    });

    it('should support skipping empty string captures when others are strings', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: [
                            {name: 'my_capture', oneOrMoreOf: {
                                oneOf: [
                                    {what: /first/},
                                    {what: /second/, modifier: function () {
                                        return '';
                                    }},
                                    {what: /third/}
                                ]
                            }}
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
            code = '  first second third  ';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            my_capture: [
                'first',
                // Note that the second capture is not present, as it was skipped due to being the empty string.
                'third'
            ],
            my_bounds: {
                start: {
                    offset: 2,
                    line: 1,
                    column: 3
                },
                end: {
                    offset: 20,
                    line: 1,
                    column: 21
                }
            }
        });
    });

    it('should support skipping empty string captures when others are component matches to merge', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: [
                            {name: 'my_capture', oneOrMoreOf: {
                                oneOf: [
                                    {name: 'first_capture', what: /first/},
                                    {what: /second/, modifier: function () {
                                        return '';
                                    }},
                                    {name: 'third_capture', what: /third/}
                                ]
                            }}
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
            code = '  first second third  ';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            my_capture: [
                {
                    first_capture: 'first',
                    my_bounds: {
                        start: {
                            offset: 2,
                            line: 1,
                            column: 3
                        },
                        end: {
                            offset: 7,
                            line: 1,
                            column: 8
                        }
                    }
                },
                // Note that the second capture is not present, as it was skipped due to being the empty string.
                {
                    third_capture: 'third',
                    my_bounds: {
                        start: {
                            offset: 15,
                            line: 1,
                            column: 16
                        },
                        end: {
                            offset: 20,
                            line: 1,
                            column: 21
                        }
                    }
                }
            ],
            my_bounds: {
                start: {
                    offset: 2,
                    line: 1,
                    column: 3
                },
                end: {
                    offset: 20,
                    line: 1,
                    column: 21
                }
            }
        });
    });

    it('should not skip a component match that happens to be the empty string', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: [
                            {name: 'my_capture', oneOrMoreOf: {
                                oneOf: [
                                    {name: 'first_capture', what: /first/},
                                    {name: 'second_capture', what: /second/, modifier: function () {
                                        return '';
                                    }},
                                    {name: 'third_capture', what: /third/}
                                ]
                            }}
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
            code = '  first second third  ';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            my_capture: [
                {
                    first_capture: 'first',
                    my_bounds: {
                        start: {
                            offset: 2,
                            line: 1,
                            column: 3
                        },
                        end: {
                            offset: 7,
                            line: 1,
                            column: 8
                        }
                    }
                },
                {
                    second_capture: '',
                    my_bounds: {
                        start: {
                            offset: 8,
                            line: 1,
                            column: 9
                        },
                        end: {
                            offset: 14,
                            line: 1,
                            column: 15
                        }
                    }
                },
                {
                    third_capture: 'third',
                    my_bounds: {
                        start: {
                            offset: 15,
                            line: 1,
                            column: 16
                        },
                        end: {
                            offset: 20,
                            line: 1,
                            column: 21
                        }
                    }
                }
            ],
            my_bounds: {
                start: {
                    offset: 2,
                    line: 1,
                    column: 3
                },
                end: {
                    offset: 20,
                    line: 1,
                    column: 21
                }
            }
        });
    });
});
