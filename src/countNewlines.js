/*
 * Parsing - JSON grammar-based parser
 * Copyright (c) Dan Phillimore (asmblah)
 * http://asmblah.github.com/parsing/
 *
 * Released under the MIT license
 * https://github.com/asmblah/parsing/raw/master/MIT-LICENSE.txt
 */

'use strict';

var REGEX = /\r?\n/g;

/**
 * Counts the number of newlines in the given string
 *
 * @param {string} text
 * @return {number}
 */
function countNewlines(text) {
    var match = text.match(REGEX);

    return match ? match.length : 0;
}

module.exports = countNewlines;
