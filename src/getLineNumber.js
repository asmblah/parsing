/*
 * Parsing - JSON grammar-based parser
 * Copyright (c) Dan Phillimore (asmblah)
 * http://asmblah.github.com/parsing/
 *
 * Released under the MIT license
 * https://github.com/asmblah/parsing/raw/master/MIT-LICENSE.txt
 */

'use strict';

function getLineNumber(text, offset) {
    function getCount(string, substring) {
        return string.split(substring).length;
    }

    return getCount(text.substr(0, offset), '\n');
}

module.exports = getLineNumber;
