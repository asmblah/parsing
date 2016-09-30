/*
 * Parsing - JSON grammar-based parser
 * Copyright (c) Dan Phillimore (asmblah)
 * http://asmblah.github.com/parsing/
 *
 * Released under the MIT license
 * https://github.com/asmblah/parsing/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    expect = require('chai').expect,
    nowdoc = require('nowdoc'),
    Parser = require('../../src/Parser');

describe('Parser', function () {
    describe('parse()', function () {
        function checkGrammarAndTextGeneratesAST(grammarSpec, text, expectedAST) {
            var grammarSpecString = JSON.stringify(grammarSpec, function (key, value) {
                if (value instanceof RegExp) {
                    return value.toString();
                }
                return value;
            });

            it('should return the correct AST when the grammar spec is ' + grammarSpecString, function () {
                var parser = new Parser(grammarSpec);

                expect(parser.parse(text)).to.deep.equal(expectedAST);
            });
        }

        function check(scenario) {
            checkGrammarAndTextGeneratesAST(scenario.grammarSpec, scenario.text, scenario.expectedAST);
        }

        describe('processor option', function () {
            check({
                grammarSpec: {
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
                text: '128',
                expectedAST: {
                    name: 'custom',
                    value: 'before 128 after'
                }
            });
        });

        describe('when given a single token and grammar contains only a matching rule', function () {
            check({
                grammarSpec: {
                    rules: {
                        'number': {name: 'value', what: /\d+/}
                    },
                    start: 'number'
                },
                text: '128',
                expectedAST: {
                    name: 'number',
                    value: '128'
                }
            });
        });

        describe('when reused for parsing a different string', function () {
            it('should return the correct AST', function () {
                var parser = new Parser({
                    rules: {
                        'number': {name: 'value', what: /\d+/}
                    },
                    start: 'number'
                });

                parser.parse('128');

                expect(parser.parse('321')).to.deep.equal({
                    name: 'number',
                    value: '321'
                });
            });
        });

        describe('"allOf" qualifier', function () {
            check({
                grammarSpec: {
                    rules: {
                        'add': /\+/,
                        'expression': [{name: 'left', what: 'number'}, {name: 'operator', what: 'add'}, {name: 'right', what: 'number'}],
                        'number': /\d+/
                    },
                    start: 'expression'
                },
                text: '128+67',
                expectedAST: {
                    name: 'expression',
                    left: '128',
                    operator: '+',
                    right: '67'
                }
            });
        });

        describe('"oneOf" qualifier', function () {
            check({
                grammarSpec: {
                    rules: {
                        'thing': [{name: 'value', oneOf: [(/\d+/), (/\w+/)]}, (/;/)]
                    },
                    start: 'thing'
                },
                text: 'hello;',
                expectedAST: {
                    name: 'thing',
                    value: 'hello'
                }
            });
        });

        describe('whitespace delimiter: "ignore" option', function () {
            check({
                grammarSpec: {
                    ignore: 'whitespace',
                    rules: {
                        'add': /\+/,
                        'expression': [{name: 'left', what: 'number'}, {name: 'operator', what: 'add'}, {name: 'right', what: 'number'}],
                        'number': /\d+/,
                        'whitespace': /\s+/
                    },
                    start: 'expression'
                },
                text: '321 + 89',
                expectedAST: {
                    name: 'expression',
                    left: '321',
                    operator: '+',
                    right: '89'
                }
            });
        });

        describe('whitespace delimiter: "ignore" option but with "ignoreWhitespace" arg set to override', function () {
            check({
                grammarSpec: {
                    ignore: 'whitespace',
                    rules: {
                        'add': /\+/,
                        'expression': [{name: 'left', what: 'string', ignoreWhitespace: false}, {name: 'operator', what: 'add'}, {name: 'right', what: 'string'}],
                        'string': /[\d\s]+/,
                        'whitespace': /\s+/
                    },
                    start: 'expression'
                },
                text: '321 + 89',
                expectedAST: {
                    name: 'expression',
                    // Check that space after number is captured too
                    left: '321 ',
                    operator: '+',
                    right: '89'
                }
            });
        });

        describe('to prevent overriding the component\'s owner rule\'s name', function () {
            check({
                grammarSpec: {
                    rules: {
                        'name': 'string',
                        'string': {
                            components: {name: 'value', what: /\w+/}
                        }
                    },
                    start: 'name'
                },
                text: 'hello',
                expectedAST: {
                    // Make sure "string" is the capture name, not "name"
                    name: 'string',
                    value: 'hello'
                }
            });
        });

        describe('when the index of the capturing group to capture is specified', function () {
            check({
                grammarSpec: {
                    rules: {
                        'expression': [{name: 'left', what: 'string'}, (/\s*\.\s*/), {name: 'right', what: 'string'}],
                        'string': {
                            components: [{what: /"([^"]*)"/, captureIndex: 1}]
                        }
                    },
                    start: 'expression'
                },
                text: '"test" . "world"',
                expectedAST: {
                    // Make sure "string" is the capture name, not "name"
                    name: 'expression',
                    left: 'test',
                    right: 'world'
                }
            });
        });

        // Support specifying
        describe('"ifNoMatch" option', function () {
            describe('when specifying to return a particular component as the result if a component does not match', function () {
                check({
                    grammarSpec: {
                        rules: {
                            'thing': {
                                components: [{name: 'name', what: (/\w+/)}, (/=/), {name: 'value', optionally: (/\w+/)}],
                                ifNoMatch: {component: 'value', capture: 'name'}
                            }
                        },
                        start: 'thing'
                    },
                    text: 'abc=',
                    expectedAST: 'abc'
                });
            });

            describe('when specifying to return a particular component as the result if a (possibly uncaptured) component does not match', function () {
                check({
                    grammarSpec: {
                        rules: {
                            'thing': {
                                components: [{name: 'name', what: (/\w+/)}, (/=/), {optionally: {name: 'value', what: (/\w+/)}}],
                                ifNoMatch: {component: 'value', capture: 'name'}
                            }
                        },
                        start: 'thing'
                    },
                    text: 'abc=',
                    expectedAST: 'abc'
                });
            });
        });

        describe('"optionally" qualifier', function () {
            describe('when "wrapInArray" is not specified and result is empty', function () {
                var scenario = {
                    grammarSpec: {
                        rules: {
                            'thing': {
                                components: [{name: 'first', what: (/ab/)}, {name: 'second', optionally: (/cd/)}]
                            }
                        },
                        start: 'thing'
                    },
                    text: 'ab',
                    expectedAST: {
                        name: 'thing',
                        first: 'ab',
                        // Note the string instead of empty array
                        second: ''
                    }
                };

                check(scenario);

                it('should return a string for the "second" component instead of an empty array', function () {
                    var parser = new Parser(scenario.grammarSpec);

                    expect(parser.parse(scenario.text).second).to.equal('');
                });
            });

            describe('when "wrapInArray" is specified and result is empty', function () {
                var scenario = {
                    grammarSpec: {
                        rules: {
                            'thing': {
                                components: [{name: 'first', what: (/ab/)}, {name: 'second', optionally: (/cd/), wrapInArray: true}]
                            }
                        },
                        start: 'thing'
                    },
                    text: 'ab',
                    expectedAST: {
                        name: 'thing',
                        first: 'ab',
                        // Note the empty array instead of string
                        second: []
                    }
                };

                check(scenario);

                it('should return an array for the "second" component instead of a string', function () {
                    var parser = new Parser(scenario.grammarSpec);

                    expect(parser.parse(scenario.text).second).to.be.an('array');
                });
            });

            describe('when "wrapInArray" is specified and result is not empty', function () {
                check({
                    grammarSpec: {
                        rules: {
                            'thing': {
                                components: [{name: 'first', what: (/ab/)}, {name: 'second', optionally: (/cd/), wrapInArray: true}]
                            }
                        },
                        start: 'thing'
                    },
                    text: 'abcd',
                    expectedAST: {
                        name: 'thing',
                        first: 'ab',
                        second: ['cd']
                    }
                });
            });

            describe('"options" option', function () {
                check({
                    grammarSpec: {
                        rules: {
                            'increment': {
                                components: [{name: 'operator', what: (/\+\+/)}, {name: 'operand', what: (/\$\w+/)}],
                                options: {fun: true}
                            }
                        },
                        start: 'increment'
                    },
                    text: '++$a',
                    expectedAST: {
                        name: 'increment',
                        fun: true,
                        operand: '$a',
                        operator: '++'
                    }
                });
            });
        });

        describe('"what" qualifier', function () {
            describe('"replace" arg', function () {
                var parser;

                _.each({
                    'replacing one character with another character when "what" arg is a regex': {
                        grammarSpec: {
                            ignore: 'whitespace',
                            rules: {
                                'operator': /\+/,
                                'number': /\d(?:\.\d+)?/,
                                'whitespace': /\s+/,
                                'expression': {
                                    components: [{name: 'left', what: 'number'}, {name: 'operator', what: 'operator'}, {name: 'right', what: (/\d+/), replace: [{
                                        pattern: /^2$/,
                                        replacement: 't'
                                    }]}]
                                }
                            },
                            start: 'expression'
                        },
                        text: '1 + 2',
                        expectedAST: {
                            name: 'expression',
                            left: '1',
                            operator: '+',
                            right: 't'
                        }
                    },
                    'replacing one character with another character when "what" arg is a rule reference': {
                        grammarSpec: {
                            ignore: 'whitespace',
                            rules: {
                                'operator': /\+/,
                                'number': /\d(?:\.\d+)?/,
                                'whitespace': /\s+/,
                                'expression': {
                                    components: [{name: 'left', what: 'number'}, {name: 'operator', what: 'operator'}, {name: 'right', what: 'number', replace: [{
                                        pattern: /^2$/,
                                        replacement: 't'
                                    }]}]
                                }
                            },
                            start: 'expression'
                        },
                        text: '1 + 2',
                        expectedAST: {
                            name: 'expression',
                            left: '1',
                            operator: '+',
                            right: 't'
                        }
                    }
                }, function (scenario, description) {
                    describe(description, function () {
                        beforeEach(function () {
                            parser = new Parser(scenario.grammarSpec);
                        });

                        it('should return the correct AST when the text is "' + scenario.text + '"', function () {
                            expect(parser.parse(scenario.text)).to.deep.equal(scenario.expectedAST);
                        });
                    });
                });
            });
        });

        describe('"allowMerge" arg', function () {
            var parser;

            _.each({
                'when "what" arg is a rule reference': {
                    grammarSpec: {
                        ignore: 'whitespace',
                        rules: {
                            'add_operator': {
                                components: {what: /\+/, allowMerge: false}
                            },
                            'number': /\d(?:\.\d+)?/,
                            'whitespace': /\s+/,
                            'expression': {
                                components: [{name: 'left', what: 'number'}, {name: 'operator', what: 'add_operator'}, {name: 'right', what: 'number'}]
                            }
                        },
                        start: 'expression'
                    },
                    text: '1 + 2',
                    expectedAST: {
                        name: 'expression',
                        left: '1',
                        operator: {name: 'add_operator'},
                        right: '2'
                    }
                }
            }, function (scenario, description) {
                describe(description, function () {
                    beforeEach(function () {
                        parser = new Parser(scenario.grammarSpec);
                    });

                    it('should return the correct AST when the text is "' + scenario.text + '"', function () {
                        expect(parser.parse(scenario.text)).to.deep.equal(scenario.expectedAST);
                    });
                });
            });
        });

        describe('"captureOffsetAs" arg', function () {
            var parser;

            _.each({
                'when "what" arg is a rule reference and there are two earlier blank lines': {
                    grammarSpec: {
                        ignore: 'whitespace',
                        rules: {
                            'operator': /\+/,
                            'number': /\d(?:\.\d+)?/,
                            'whitespace': /\s+/,
                            'expression': {
                                components: [{name: 'left', what: 'number'}, {name: 'operator', what: 'operator'}, {name: 'right', what: 'number', captureOffsetAs: 'capturedRightOffset'}]
                            }
                        },
                        start: 'expression'
                    },
                    text: '\n\n1 + 2',
                    expectedAST: {
                        name: 'expression',
                        left: '1',
                        operator: '+',
                        right: '2',
                        capturedRightOffset: {
                            offset: 6,
                            line: 3,
                            column: 5,
                            length: 1
                        }
                    }
                },
                'when "what" arg text is not captured, only its offset': {
                    grammarSpec: {
                        ignore: 'whitespace',
                        rules: {
                            'operator': /\+/,
                            'number': /\d(?:\.\d+)?/,
                            'whitespace': /\s+/,
                            'expression': {
                                components: [{name: 'left', what: 'number'}, {name: 'operator', what: 'operator'}, {what: 'number', captureOffsetAs: 'capturedRightOffset'}]
                            }
                        },
                        start: 'expression'
                    },
                    text: '\n\n1 + 2',
                    expectedAST: {
                        name: 'expression',
                        left: '1',
                        operator: '+',
                        capturedRightOffset: {
                            offset: 6,
                            line: 3,
                            column: 5,
                            length: 1
                        }
                    }
                },
                'with longer match': {
                    grammarSpec: {
                        ignore: 'whitespace',
                        rules: {
                            'operator': /\+/,
                            'number': /\d+(?:\.\d+)?/,
                            'whitespace': /\s+/,
                            'expression': {
                                components: [{name: 'left', what: 'number'}, {name: 'operator', what: 'operator'}, {what: 'number', captureOffsetAs: 'capturedRightOffset'}]
                            }
                        },
                        start: 'expression'
                    },
                    text: '\n\n126 + 24123',
                    expectedAST: {
                        name: 'expression',
                        left: '126',
                        operator: '+',
                        capturedRightOffset: {
                            offset: 8,
                            line: 3,
                            column: 7,
                            length: 5
                        }
                    }
                }
            }, function (scenario, description) {
                describe(description, function () {
                    beforeEach(function () {
                        parser = new Parser(scenario.grammarSpec);
                    });

                    it('should return the correct AST when the text is "' + scenario.text + '"', function () {
                        expect(parser.parse(scenario.text)).to.deep.equal(scenario.expectedAST);
                    });
                });
            });
        });

        describe('when using grammar spec #1', function () {
            var grammarSpec,
                parser;

            beforeEach(function () {
                /*
                 * Based on this EBNF grammar
                 * - from http://stackoverflow.com/questions/6805172/how-do-you-abstract-some-expression-to-bnf#answer-6805185
                 *
                 * AEXP => AS+
                 * AS   => id ':=' EX1 ';'
                 * EX1  => EX2 (('+' | '-') EX2)*
                 * EX2  => EX3 (('*' | '/') EX3)*
                 * EX3  => EX4 ('^' EX3)*
                 * EX4  => ('+'|'-')? EX5
                 * EX5  => id | number | '(' EX1 ')'
                 */
                grammarSpec = {
                    ignore: 'whitespace',
                    rules: {
                        'assign': /:=/,
                        'character': /[;*\/^+-]/,
                        'id': /[\w$][\w\d$]*/,
                        'number': /\d(?:\.\d+)?/,
                        'whitespace': /\s+/,
                        'AEXP': {
                            components: {name: 'assignment', oneOrMoreOf: 'AS'}
                        },
                        'AS': {
                            components: [{name: 'target', what: 'id'}, 'assign', {name: 'expression', what: 'EX1'}, {'character': ';'}]
                        },
                        'EX1': {
                            captureAs: 'EX',
                            components: [{name: 'left', what: 'EX2'}, {name: 'right', zeroOrMoreOf: [{name: 'operator', oneOf: [{'character': '+'}, {'character': '-'}]}, {name: 'operand', what: 'EX2'}]}],
                            ifNoMatch: {component: 'right', capture: 'left'}
                        },
                        'EX2': {
                            captureAs: 'EX',
                            components: [{name: 'left', what: 'EX3'}, {name: 'right', zeroOrMoreOf: [{name: 'operator', oneOf: [{'character': '*'}, {'character': '/'}]}, {name: 'operand', what: 'EX3'}]}],
                            ifNoMatch: {component: 'right', capture: 'left'}
                        },
                        'EX3': {
                            captureAs: 'EX',
                            components: [{name: 'left', what: 'EX4'}, {name: 'right', zeroOrMoreOf: [{name: 'operator', what: {'character': '^'}}, {name: 'operand', rule: 'EX3'}]}],
                            ifNoMatch: {component: 'right', capture: 'left'}
                        },
                        'EX4': {
                            captureAs: 'EX',
                            components: [{name: 'operator', optionally: {oneOf: [{'character': '+'}, {'character': '-'}]}}, {name: 'operand', what: 'EX5'}],
                            ifNoMatch: {component: 'operator', capture: 'operand'}
                        },
                        'EX5': {
                            components: [{oneOf: ['id', 'number', [{'character': '('}, 'EX1', {'character': ')'}]]}]
                        }
                    },
                    start: 'AEXP'
                };

                parser = new Parser(grammarSpec);
            });

            _.each([
                {
                    text: 'waldo:=1;',
                    expectedAST: {
                        name: 'AEXP',
                        assignment: [{
                            name: 'AS',
                            target: 'waldo',
                            expression: '1'
                        }]
                    }
                },
                {
                    text: 'waldo:=2+3;',
                    expectedAST: {
                        name: 'AEXP',
                        assignment: [{
                            name: 'AS',
                            target: 'waldo',
                            expression: {
                                name: 'EX',
                                left: '2',
                                right: [{
                                    operator: '+',
                                    operand: '3'
                                }]
                            }
                        }]
                    }
                },
                {
                    // Precedence is equivalent to "waldo := (fern + (alpha / ((-beta) ^ gamma)));"
                    text: 'waldo := fern + alpha / -beta ^ gamma;',
                    expectedAST: {
                        name: 'AEXP',
                        assignment: [{
                            name: 'AS',
                            target: 'waldo',
                            expression: {
                                name: 'EX',
                                left: 'fern',
                                right: [{
                                    operator: '+',
                                    operand: {
                                        name: 'EX',
                                        left: 'alpha',
                                        right: [{
                                            operator: '/',
                                            operand: {
                                                name: 'EX',
                                                left: {
                                                    name: 'EX',
                                                    operator: '-',
                                                    operand: 'beta'
                                                },
                                                right: [{
                                                    operator: '^',
                                                    operand: 'gamma'
                                                }]
                                            }
                                        }]
                                    }
                                }]
                            }
                        }]
                    }
                }
            ], function (scenario) {
                it('should return the correct AST when the text is "' + scenario.text + '"', function () {
                    expect(parser.parse(scenario.text)).to.deep.equal(scenario.expectedAST);
                });
            });
        });

        describe('custom rules option', function () {
            it('should support overriding a rule with a new one that references the original', function () {
                var grammarSpec = {
                        ignore: 'whitespace',
                        rules: {
                            'go_statement': {
                                components: [{what: /go/, allowMerge: false}]
                            },
                            'end_statement': {
                                components: [{what: /end/, allowMerge: false}]
                            },
                            'whitespace': /\s+/,
                            'single_statement': {
                                components: {oneOf: ['go_statement', 'end_statement']}
                            },
                            'statement': {
                                components: ['single_statement', /;/]
                            },
                            'program': {
                                components: {name: 'statements', zeroOrMoreOf: 'statement'}
                            }
                        },
                        start: 'program'
                    },
                    options = {
                        rules: {
                            'do_something_statement': {
                                components: [{what: /do_something_custom/, allowMerge: false}]
                            },
                            'single_statement': {
                                // Override `single_statement`, but refer back to the original
                                components: {oneOf: ['do_something_statement', 'single_statement']}
                            }
                        }
                    },
                    parser = new Parser(grammarSpec, null, options);

                expect(parser.parse('go; do_something_custom; end;')).to.deep.equal({
                    name: 'program',
                    statements: [
                        {name: 'go_statement'},
                        {name: 'do_something_statement'},
                        {name: 'end_statement'}
                    ]
                });
            });
        });

        describe('capture all offsets option', function () {
            it('should support capturing an offset for every AST node', function () {
                var grammarSpec = {
                        ignore: 'whitespace',
                        rules: {
                            'go_statement': {
                                components: [{what: /go/, allowMerge: false}]
                            },
                            'do_something_statement': {
                                components: [
                                    {what: /do_something_custom/, allowMerge: false},
                                    {name: 'thing', rule: 'do_thing_arg'}
                                ]
                            },
                            'some_identifier': {
                                components: [(/\w/), (/\w+/)] // Multiple components just for testing concatenation
                            },
                            'do_thing_arg': {
                                components: {name: 'fallen_back_identifier', rule: 'with_fallback'}
                            },
                            'with_fallback': {
                                components: [{name: 'something_that_wont_match', optionally: /AAAA/}, {name: 'identifier', rule: 'some_identifier'}],
                                ifNoMatch: {component: 'something_that_wont_match', capture: 'identifier'}
                            },
                            'end_statement': {
                                components: [{what: /end/, allowMerge: false}],
                                processor: function () {
                                    return {
                                        name: 'end_statement'
                                        // Ensure `my_offset` is added to the resulting node,
                                        // even though this processor has ignored it
                                    };
                                }
                            },
                            'whitespace': /\s+/,
                            'single_statement': {
                                components: {oneOf: ['go_statement', 'do_something_statement', 'end_statement']}
                            },
                            'statement': {
                                components: ['single_statement', /;/]
                            },
                            'program': {
                                components: {name: 'statements', zeroOrMoreOf: 'statement'}
                            }
                        },
                        start: 'program',
                        offsets: 'my_offset'
                    },
                    options = {
                        captureAllOffsets: true
                    },
                    parser = new Parser(grammarSpec, null, options),
                    code = nowdoc(function () {/*<<<EOS
go;


  do_something_custom   open_it;


    end;
EOS
*/;}); //jshint ignore:line

                expect(parser.parse(code)).to.deep.equal({
                    name: 'program',
                    statements: [
                        {
                            name: 'go_statement',
                            my_offset: {
                                length: 3,
                                line: 1,
                                column: 1,
                                offset: 0
                            }
                        },
                        {
                            name: 'do_something_statement',
                            thing: {
                                name: 'do_thing_arg',
                                fallen_back_identifier: 'open_it',
                                my_offset: {
                                    length: 7,
                                    line: 4,
                                    column: 25,
                                    offset: 30
                                }
                            },
                            my_offset: {
                                length: 30,
                                line: 4,
                                column: 3,
                                offset: 8
                            }
                        },
                        {
                            name: 'end_statement',
                            my_offset: {
                                length: 4,
                                line: 7,
                                column: 5,
                                offset: 45
                            }
                        }
                    ],
                    my_offset: {
                        length: 49,
                        line: 1,
                        column: 1,
                        offset: 0
                    }
                });
            });
        });
    });
});
