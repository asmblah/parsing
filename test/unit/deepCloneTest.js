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
    deepClone = require('../../src/deepClone'),
    expect = require('chai').expect;

describe('deepClone()', function () {
    describe('primitives and null', function () {
        _.each({
            'null': {value: null, expected: null},
            'a string': {value: 'hello', expected: 'hello'},
            'the empty string': {value: '', expected: ''},
            'a number': {value: 42, expected: 42},
            'zero': {value: 0, expected: 0},
            'a boolean true': {value: true, expected: true},
            'a boolean false': {value: false, expected: false}
        }, function (scenario, description) {
            it('should return ' + description + ' as-is', function () {
                expect(deepClone(scenario.value)).to.equal(scenario.expected);
            });
        });
    });

    describe('arrays', function () {
        it('should return a new array, not the original reference', function () {
            var original = [1, 2, 3];

            expect(deepClone(original)).not.to.equal(original);
        });

        it('should clone a flat array with the same elements', function () {
            expect(deepClone([1, 'two', true, null])).to.deep.equal([1, 'two', true, null]);
        });

        it('should clone an empty array', function () {
            expect(deepClone([])).to.deep.equal([]);
        });

        it('should deep-clone nested arrays so mutation does not affect the original', function () {
            var original = [[1, 2], [3, 4]],
                clone = deepClone(original);

            clone[0][0] = 99;

            expect(original[0][0]).to.equal(1);
        });

        it('should deep-clone objects inside arrays so mutation does not affect the original', function () {
            var original = [{name: 'N_FOO', value: 'hello'}],
                clone = deepClone(original);

            clone[0].value = 'changed';

            expect(original[0].value).to.equal('hello');
        });
    });

    describe('plain objects', function () {
        it('should return a new object, not the original reference', function () {
            var original = {a: 1};

            expect(deepClone(original)).not.to.equal(original);
        });

        it('should clone a flat object with the same properties', function () {
            expect(deepClone({name: 'N_NODE', value: 'hello', count: 3}))
                .to.deep.equal({name: 'N_NODE', value: 'hello', count: 3});
        });

        it('should clone an empty object', function () {
            expect(deepClone({})).to.deep.equal({});
        });

        it('should only copy own enumerable properties, not inherited ones', function () {
            var proto = {inherited: 'yes'},
                original = Object.create(proto);

            original.own = 'mine';

            var clone = deepClone(original);

            expect(clone.own).to.equal('mine');
            expect(Object.prototype.hasOwnProperty.call(clone, 'inherited')).to.be.false;
        });

        it('should deep-clone nested objects so mutation does not affect the original', function () {
            var original = {
                    name: 'N_METHOD',
                    returnType: {name: 'N_TYPE', value: 'int'}
                },
                clone = deepClone(original);

            clone.returnType.value = 'string';

            expect(original.returnType.value).to.equal('int');
        });

        it('should deep-clone array-valued properties so mutation does not affect the original', function () {
            var original = {
                    name: 'N_METHOD',
                    args: [{name: 'N_ARG', variable: 'a'}, {name: 'N_ARG', variable: 'b'}]
                },
                clone = deepClone(original);

            clone.args[0].variable = 'changed';

            expect(original.args[0].variable).to.equal('a');
        });

        it('should deep-clone a realistic AST match object', function () {
            var original = {
                    components: {
                        name: 'N_METHOD_DEFINITION',
                        visibility: 'protected',
                        method: 'myMethod',
                        args: [
                            {name: 'N_ARGUMENT', type: {name: 'N_TYPE', value: 'int'}, variable: 'a'}
                        ],
                        returnType: {name: 'N_TYPE', value: 'void'},
                        bounds: {
                            start: {offset: 5, line: 1, column: 5},
                            end: {offset: 100, line: 3, column: 10}
                        }
                    },
                    firstLine: 1,
                    lines: 3,
                    textOffset: 5,
                    textLength: 95
                },
                clone = deepClone(original);

            // Mutate deeply nested properties on the clone.
            clone.components.visibility = 'public';
            clone.components.args[0].variable = 'changed';
            clone.components.bounds.start.offset = 999;

            // Original must be entirely unaffected.
            expect(original.components.visibility).to.equal('protected');
            expect(original.components.args[0].variable).to.equal('a');
            expect(original.components.bounds.start.offset).to.equal(5);
            // Primitive properties on the root are also unaffected.
            expect(original.firstLine).to.equal(1);
        });
    });
});
