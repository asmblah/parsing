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
    util = require('util');

function Exception(message) {
    this.message = message;
}

util.inherits(Exception, Error);

_.extend(Exception.prototype, {
    type: 'Exception',

    getMessage: function () {
        return this.message;
    }
});

module.exports = Exception;
