/*
 * Parsing - JSON grammar-based parser
 * Copyright (c) Dan Phillimore (asmblah)
 * http://asmblah.github.com/parsing/
 *
 * Released under the MIT license
 * https://github.com/asmblah/parsing/raw/master/MIT-LICENSE.txt
 */

'use strict';

var hasOwn = Object.prototype.hasOwnProperty;

/**
 * Fast deep-clone for the plain objects and arrays that make up AST nodes and match results.
 * This avoids the overhead of structuredClone (or its core-js-pure polyfill) for types
 * we don't need: Date, RegExp, Map, Set, etc. never appear in parse results.
 *
 * @param {*} value
 * @returns {*}
 */
function deepClone(value) {
    var i, key, result;

    if (value === null || typeof value !== 'object') {
        return value;
    }

    if (Array.isArray(value)) {
        result = new Array(value.length);

        for (i = 0; i < value.length; i++) {
            result[i] = deepClone(value[i]);
        }

        return result;
    }

    result = {};

    for (key in value) {
        if (hasOwn.call(value, key)) {
            result[key] = deepClone(value[key]);
        }
    }

    return result;
}

module.exports = deepClone;
