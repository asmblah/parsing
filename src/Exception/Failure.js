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
 * Represents an explicit failed parse attempt
 *
 * @param {string} message The error message
 * @param {*} result The result from the custom ErrorHandler
 * @constructor
 */
function FailureException(
    message,
    result
) {
    Exception.call(this, message);

    /**
     * @type {*}
     */
    this.result = result;
}

util.inherits(FailureException, Exception);

_.extend(FailureException.prototype, {
    /**
     * Fetches the result returned from the custom ErrorHandler
     *
     * @return {*}
     */
    getResult: function () {
        return this.result;
    }
});

module.exports = FailureException;
