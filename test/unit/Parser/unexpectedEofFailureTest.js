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

describe('Parser unexpected end-of-file failures', function () {
    it('should throw a ParseException when there is no custom ErrorHandler specified', function () {
        var caughtError,
            grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_program': {
                        components: [
                            {oneOf: ['my_first_statement', 'my_second_statement']},
                            {oneOf: ['my_first_statement', 'my_second_statement']}
                        ]
                    },
                    'my_first_statement': {
                        components: [{name: 'text', what: /first/}]
                    },
                    'my_second_statement': {
                        components: [{name: 'text', what: /second/}]
                    },
                    'whitespace': /\s+/,
                },
                start: 'my_program',
                bounds: 'my_bounds'
            },
            parser = new Parser(grammarSpec),
            code = '   first';

        try {
            parser.parse(code);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).to.be.an.instanceOf(ParseException);
        expect(caughtError.getMessage()).to.equal('Parser.parse() :: Unexpected end of file');
        // Note that the whitespace before the match _was_ consumed first
        expect(caughtError.getStartOffset()).to.equal(3);
        expect(caughtError.getEndOffset()).to.equal(8);
        expect(caughtError.getEndLineNumber()).to.equal(1);
        expect(caughtError.getText()).to.equal(code);
        expect(caughtError.unexpectedEndOfInput()).to.be.true;
    });
});
