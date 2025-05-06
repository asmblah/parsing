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
describe('Parser grammar rule match processor skip behaviour', function () {
    it('should support a processor returning the empty string to skip a match when bounds are captured', function () {
        var grammarSpec = {
                rules: {
                    'skipped_number': {
                        name: 'value',
                        what: /\d+/,
                        processor: function () {
                            return '';
                        }
                    },
                    'number': {
                        name: 'value',
                        what: /\d+/
                    },
                    'my_rule': {
                        components: [{
                            name: 'my_capture',
                            oneOf: [{
                                rule: 'skipped_number'
                            }, {
                                rule: 'number'
                            }]
                        }]
                    }
                },
                start: 'my_rule',
                bounds: 'my_bounds'
            },
            options = {
                captureAllBounds: true
            },
            parser = new Parser(grammarSpec, null, options),
            code = '128';

        expect(parser.parse(code)).to.deep.equal({
            name: 'my_rule',
            my_capture: '',
            my_bounds: {
                start: {
                    offset: 0,
                    line: 1,
                    column: 1
                },
                end: {
                    offset: 3,
                    line: 1,
                    column: 4
                }
            }
        });
    });
});
