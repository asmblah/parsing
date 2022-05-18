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
describe('Parser grammar rule match processor reentrancy', function () {
    it('should support calling the parser from a processor', function () {
        var grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'go_statement': {
                        components: [{what: /go/, allowMerge: false}]
                    },
                    'detached_heredoc_innards': {
                        components: {name: 'contents', oneOrMoreOf: 'heredoc_inner_statement'}
                    },
                    'heredoc_inner_statement': {
                        components: [{what: /nested/, allowMerge: false}]
                    },
                    'end_statement': {
                        components: [{what: /end/, allowMerge: false}]
                    },
                    'whitespace': /\s+/,
                    'single_statement': {
                        components: {oneOf: ['go_statement', 'heredoc_statement', 'end_statement']}
                    },
                    'statement': {
                        components: ['single_statement', /;/]
                    },
                    'heredoc_statement': {
                        components: [{name: 'string', what: /<<<(\w+)(.*)\1/, captureIndex: 2}],
                        processor: function (node, parse) {
                            var innardsMatch = parse(node.string, {}, 'detached_heredoc_innards');

                            if (innardsMatch === null) {
                                return node;
                            }

                            return {
                                name: 'heredoc',
                                contents: innardsMatch.contents
                            };
                        }
                    },
                    'program': {
                        components: {name: 'statements', zeroOrMoreOf: 'statement'}
                    }
                },
                start: 'program'
            },
            parser = new Parser(grammarSpec);

        expect(parser.parse('go; <<<EOS nested EOS; end;')).to.deep.equal({
            name: 'program',
            statements: [
                {name: 'go_statement'},
                {
                    name: 'heredoc',
                    contents: [
                        {name: 'heredoc_inner_statement'}
                    ]
                },
                {name: 'end_statement'}
            ]
        });
    });
});
