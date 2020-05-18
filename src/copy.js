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

function copy(to, from) {
    var key;

    for (key in from) {
        if (hasOwn.call(from, key)) {
            to[key] = from[key];
        }
    }
}

// Use native Object.assign(...) if available for speed
module.exports = Object.assign || copy;
