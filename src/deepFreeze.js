/*
 * Parsing - JSON grammar-based parser
 * Copyright (c) Dan Phillimore (asmblah)
 * http://asmblah.github.com/parsing/
 *
 * Released under the MIT license
 * https://github.com/asmblah/parsing/raw/master/MIT-LICENSE.txt
 */

'use strict';

var hasOwn = {}.hasOwnProperty;

/**
 * Recursively freezes a plain-object/array tree in place.
 * Already-frozen objects are skipped.
 *
 * @param {*} value
 * @return {*} The same value, now frozen.
 */
function deepFreeze(value) {
    var i, key;

    if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
        return value;
    }

    Object.freeze(value);

    if (Array.isArray(value)) {
        for (i = 0; i < value.length; i++) {
            deepFreeze(value[i]);
        }
    } else {
        for (key in value) {
            if (hasOwn.call(value, key)) {
                deepFreeze(value[key]);
            }
        }
    }

    return value;
}

module.exports = deepFreeze;
