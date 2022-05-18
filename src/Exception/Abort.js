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
    util = require('util'),
    Exception = require('./Exception');

/**
 * Represents an explicitly aborted parse attempt.
 *
 * @param {string} message The error message
 * @param {*} result The result from the custom ErrorHandler
 * @constructor
 */
function AbortException(
    message,
    result
) {
    Exception.call(this, message);

    /**
     * @type {*}
     */
    this.result = result;
}

util.inherits(AbortException, Exception);

_.extend(AbortException.prototype, {
    /**
     * Fetches the result returned from the custom ErrorHandler.
     *
     * @return {*}
     */
    getResult: function () {
        return this.result;
    }
});

module.exports = AbortException;
