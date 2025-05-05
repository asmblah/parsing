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

describe('Parser left-recursion', function () {
    it('should support basic left-recursion', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'expr': {
                        components: [
                            {oneOf: [
                                [
                                    {name: 'left', rule: 'expr'},
                                    {name: 'operator', what: /[*/+-]/},
                                    {name: 'right', rule: 'expr'}
                                ],
                                'term'
                            ]}
                        ]
                    },
                    'term': {
                        components: [{name: 'value', what: /\d+/}]
                    },
                    'whitespace': /\s+/,
                },
                start: 'expr',
                bounds: 'my_bounds'
            },
            options = {
                captureAllBounds: true
            },
            parser = new Parser(grammarSpec, null, options),
            code = '21 + 2 - 4';

        expect(parser.parse(code)).to.deep.equal({
            name: 'expr',
            left: {
                name: 'term',
                value: '21',
                my_bounds: {
                    start: {
                        column: 1,
                        line: 1,
                        offset: 0
                    },
                    end: {
                        column: 3,
                        line: 1,
                        offset: 2
                    }
                }
            },
            operator: '+',
            right: {
                name: 'expr',
                left: {
                    name: 'term',
                    value: '2',
                    my_bounds: {
                        start: {
                            column: 6,
                            line: 1,
                            offset: 5
                        },
                        end: {
                            column: 7,
                            line: 1,
                            offset: 6
                        }
                    }
                },
                operator: '-',
                right: {
                    name: 'term',
                    value: '4',
                    my_bounds: {
                        start: {
                            column: 10,
                            line: 1,
                            offset: 9
                        },
                        end: {
                            column: 11,
                            line: 1,
                            offset: 10
                        }
                    }
                },
                my_bounds: {
                    start: {
                        column: 6,
                        line: 1,
                        offset: 5
                    },
                    end: {
                        column: 11,
                        line: 1,
                        offset: 10
                    }
                }
            },
            my_bounds: {
                start: {
                    column: 1,
                    line: 1,
                    offset: 0
                },
                end: {
                    column: 11,
                    line: 1,
                    offset: 10
                }
            }
        });
    });

    it('should handle deeply nested left-recursion', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'expr': {
                        components: [
                            {oneOf: [
                                [
                                    {name: 'left', rule: 'expr'},
                                    {name: 'operator', what: /[*/+-]/},
                                    {name: 'right', rule: 'expr'}
                                ],
                                'term'
                            ]}
                        ]
                    },
                    'term': {
                        components: [{name: 'value', what: /\d+/}]
                    },
                    'whitespace': /\s+/,
                },
                start: 'expr',
                bounds: 'my_bounds'
            },
            options = {
                captureAllBounds: true
            },
            parser = new Parser(grammarSpec, null, options),
            code = '1 + 2 + 3 + 4 + 5';

        expect(parser.parse(code)).to.deep.equal({
            left: {
                name: 'term',
                value: '1',
                my_bounds: {
                    start: { column: 1, line: 1, offset: 0 },
                    end: { column: 2, line: 1, offset: 1 }
                }
            },
            name: 'expr',
            operator: '+',
            right: {
                left: {
                    name: 'term',
                    value: '2',
                    my_bounds: {
                        start: { column: 5, line: 1, offset: 4 },
                        end: { column: 6, line: 1, offset: 5 }
                    }
                },
                name: 'expr',
                operator: '+',
                right: {
                    left: {
                        name: 'term',
                        value: '3',
                        my_bounds: {
                            start: { column: 9, line: 1, offset: 8 },
                            end: { column: 10, line: 1, offset: 9 }
                        }
                    },
                    name: 'expr',
                    operator: '+',
                    right: {
                        left: {
                            name: 'term',
                            value: '4',
                            my_bounds: {
                                start: { column: 13, line: 1, offset: 12 },
                                end: { column: 14, line: 1, offset: 13 }
                            }
                        },
                        name: 'expr',
                        operator: '+',
                        right: {
                            name: 'term',
                            value: '5',
                            my_bounds: {
                                start: { column: 17, line: 1, offset: 16 },
                                end: { column: 18, line: 1, offset: 17 }
                            }
                        },
                        my_bounds: {
                            start: { column: 13, line: 1, offset: 12 },
                            end: { column: 18, line: 1, offset: 17 }
                        }
                    },
                    my_bounds: {
                        start: { column: 9, line: 1, offset: 8 },
                        end: { column: 18, line: 1, offset: 17 }
                    }
                },
                my_bounds: {
                    start: { column: 5, line: 1, offset: 4 },
                    end: { column: 18, line: 1, offset: 17 }
                }
            },
            my_bounds: {
                start: { column: 1, line: 1, offset: 0 },
                end: { column: 18, line: 1, offset: 17 }
            }
        });
    });

    it('should handle left-recursion with different operators', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'expr': {
                        components: [
                            {oneOf: [
                                [
                                    {name: 'left', rule: 'expr'},
                                    {name: 'operator', what: /[*/+-]/},
                                    {name: 'right', rule: 'expr'}
                                ],
                                'term'
                            ]}
                        ]
                    },
                    'term': {
                        components: [{name: 'value', what: /\d+/}]
                    },
                    'whitespace': /\s+/,
                },
                start: 'expr',
                bounds: 'my_bounds'
            },
            options = {
                captureAllBounds: true
            },
            parser = new Parser(grammarSpec, null, options),
            code = '1 + 2 * 3 - 4';

        expect(parser.parse(code)).to.deep.equal({
            left: {
                name: 'term',
                value: '1',
                my_bounds: {
                    start: { column: 1, line: 1, offset: 0 },
                    end: { column: 2, line: 1, offset: 1 }
                }
            },
            name: 'expr',
            operator: '+',
            right: {
                left: {
                    name: 'term',
                    value: '2',
                    my_bounds: {
                        start: { column: 5, line: 1, offset: 4 },
                        end: { column: 6, line: 1, offset: 5 }
                    }
                },
                name: 'expr',
                operator: '*',
                right: {
                    left: {
                        name: 'term',
                        value: '3',
                        my_bounds: {
                            start: { column: 9, line: 1, offset: 8 },
                            end: { column: 10, line: 1, offset: 9 }
                        }
                    },
                    name: 'expr',
                    operator: '-',
                    right: {
                        name: 'term',
                        value: '4',
                        my_bounds: {
                            start: { column: 13, line: 1, offset: 12 },
                            end: { column: 14, line: 1, offset: 13 }
                        }
                    },
                    my_bounds: {
                        start: { column: 9, line: 1, offset: 8 },
                        end: { column: 14, line: 1, offset: 13 }
                    }
                },
                my_bounds: {
                    start: { column: 5, line: 1, offset: 4 },
                    end: { column: 14, line: 1, offset: 13 }
                }
            },
            my_bounds: {
                start: { column: 1, line: 1, offset: 0 },
                end: { column: 14, line: 1, offset: 13 }
            }
        });
    });

    it('should handle incomplete expressions gracefully', function () {
        var caughtError,
            grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'expr': {
                        components: [
                            {oneOf: [
                                [
                                    {name: 'left', rule: 'expr'},
                                    {name: 'operator', what: /[*/+-]/},
                                    {name: 'right', rule: 'expr'}
                                ],
                                'term'
                            ]}
                        ]
                    },
                    'term': {
                        components: [{name: 'value', what: /\d+/}]
                    },
                    'whitespace': /\s+/,
                },
                start: 'expr',
                bounds: 'my_bounds'
            },
            options = {
                captureAllBounds: true
            },
            parser = new Parser(grammarSpec, null, options),
            code = '1 + ';

        try {
            parser.parse(code);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).to.be.an.instanceOf(ParseException);
        expect(caughtError.getMessage()).to.equal('Parser.parse() :: Unexpected end of file');
        expect(caughtError.getStartOffset()).to.equal(0);
        expect(caughtError.getEndOffset()).to.equal(4);
        expect(caughtError.getEndLineNumber()).to.equal(1);
        expect(caughtError.getText()).to.equal(code);
        expect(caughtError.unexpectedEndOfInput()).to.be.true;
    });
});
