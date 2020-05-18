/*
 * Parsing - JSON grammar-based parser
 * Copyright (c) Dan Phillimore (asmblah)
 * http://asmblah.github.com/parsing/
 *
 * Released under the MIT license
 * https://github.com/asmblah/parsing/raw/master/MIT-LICENSE.txt
 */

'use strict';

/**
 * Finds the offset of the most recent newline back from the given offset
 *
 * @param {string} text
 * @param {number} offset
 * @return {number}
 */
function findLastNewlineFrom(text, offset) {
    // NB: \r is not mentioned here, but should usually be paired with \r\n
    //     if present (on Windows), so as the \n is last it should not matter
    //     due to a reverse search being used. If a classic Mac line-ending format
    //     (only \r) was used then this would be an issue, though.
    var newlineOffset = text.lastIndexOf('\n', offset);

    if (newlineOffset === -1) {
        newlineOffset = 0;
    } else {
        newlineOffset++; // Accommodate the width of the newline char itself
    }

    return newlineOffset;
}

module.exports = findLastNewlineFrom;
