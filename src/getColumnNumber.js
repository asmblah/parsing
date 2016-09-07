/*
 * Parsing - JSON grammar-based parser
 * Copyright (c) Dan Phillimore (asmblah)
 * http://asmblah.github.com/parsing/
 *
 * Released under the MIT license
 * https://github.com/asmblah/parsing/raw/master/MIT-LICENSE.txt
 */

'use strict';

var regex = /[\s\S]*^/m;

function getColumnNumber(text, offset) {
    return text.substr(0, offset).replace(regex, '').length + 1;
}

module.exports = getColumnNumber;
