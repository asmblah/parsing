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

describe('Parser no match failures', function () {
    it('should throw a ParseException when there is no custom ErrorHandler specified', function () {
        var caughtError,
            grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_program': {
                        components: {
                            oneOrMoreOf: {oneOf: ['my_first_statement', 'my_second_statement']}
                        }
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
            code = 'this will not match at all';

        try {
            parser.parse(code);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).to.be.an.instanceOf(ParseException);
        expect(caughtError.getMessage()).to.equal('Parser.parse() :: No match');
        expect(caughtError.getFurthestMatchEnd()).to.equal(-1);
        expect(caughtError.getLineNumber()).to.equal(-1);
        expect(caughtError.getText()).to.equal(code);
        expect(caughtError.unexpectedEndOfInput()).to.be.false;
    });
});
