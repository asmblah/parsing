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

describe('Parser "allOf" qualifier', function () {
    it('should support capturing bounds for every AST node with a single rule', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        // Implicit "allOf" qualifier by using an array of rule components
                        components: [{name: 'my_capture', what: /my\s+\w+/}]
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
            my_capture: 'my\n text',
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

    it('should support skipping empty string captures when others are strings', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: [
                            {name: 'my_capture', what: [ // Will use an allOf qualifier.
                                {what: /first/},
                                {what: /second/, modifier: function () {
                                    return '';
                                }},
                                {what: /third/}
                            ]}
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
            // Note that the second capture is not present, as it was skipped due to being the empty string.
            my_capture: 'firstthird',
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
                            {name: 'my_capture', what: [ // Will use an allOf qualifier.
                                {name: 'first_capture', what: /first/},
                                {what: /second/, modifier: function () {
                                    return '';
                                }},
                                {name: 'third_capture', what: /third/}
                            ]}
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
            my_capture: {
                first_capture: 'first',
                third_capture: 'third',
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
            },
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
                            {name: 'my_capture', what: [ // Will use an allOf qualifier.
                                {name: 'first_capture', what: /first/},
                                {name: 'second_capture', what: /second/, modifier: function () {
                                    return '';
                                }},
                                {name: 'third_capture', what: /third/}
                            ]}
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
            my_capture: {
                first_capture: 'first',
                second_capture: '',
                third_capture: 'third',
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
            },
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
