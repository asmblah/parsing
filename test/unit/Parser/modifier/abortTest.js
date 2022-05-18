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
    ParseException = require('../../../../src/Exception/Parse'),
    Parser = require('../../../../src/Parser');

// Note that these are not the same as Processors, which operate on a Rule's root Component
describe('Parser grammar component match modifier abort', function () {
    it('should support "what" component modifiers aborting the parse', function () {
        var caughtError,
            grammarSpec = {
                ignore: 'whitespace',
                rules: {
                    'my_rule': {
                        components: [{
                            name: 'my_capture',
                            what: /my\s+\w+/,
                            modifier: function (capture, parse, abort) {
                                abort('My abort message', {my: 'context'});
                            }
                        }]
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
            code = '\n\n  my\n text  ';

        try {
            parser.parse(code);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).to.be.an.instanceOf(ParseException);
        expect(caughtError.getMessage()).to.equal('My abort message');
        expect(caughtError.getContext()).to.deep.equal({my: 'context'});
        // Note that the whitespace before the match _was_ consumed first.
        expect(caughtError.getStartOffset()).to.equal(4);
        // Note that the whitespace after the match was not consumed, as the abort
        // was explicitly raised in the modifier callback.
        expect(caughtError.getEndOffset()).to.equal(12);
        expect(caughtError.getStartLineNumber()).to.equal(3);
        expect(caughtError.getEndLineNumber()).to.equal(4);
        expect(caughtError.getText()).to.equal(code);
        expect(caughtError.unexpectedEndOfInput()).to.be.false;
    });
});
