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

describe('Parser custom rules option', function () {
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
