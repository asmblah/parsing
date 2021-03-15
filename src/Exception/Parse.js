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
    getLineNumber = require('../getLineNumber'),
    util = require('util'),
    Exception = require('./Exception');

/**
 * Represents a failed parse attempt
 *
 * @param {string} message The error message
 * @param {string} text The original text string being parsed
 * @param {number} furthestMatchStart
 * @param {number} furthestMatchEnd
 * @param {Object} context
 * @constructor
 */
function ParseException(
    message,
    text,
    furthestMatchStart,
    furthestMatchEnd,
    context
) {
    Exception.call(this, message);

    /**
     * @type {Object}
     */
    this.context = context;
    /**
     * @type {number}
     */
    this.furthestMatchEnd = furthestMatchEnd;
    /**
     * @type {number}
     */
    this.furthestMatchStart = furthestMatchStart;
    /**
     * @type {string}
     */
    this.text = text;
}

util.inherits(ParseException, Exception);

_.extend(ParseException.prototype, {
    /**
     * Returns the context of the failure
     *
     * @returns {Object}
     */
    getContext: function () {
        return this.context;
    },

    /**
     * Fetches the last 1-based line number that the parse reached before terminating
     *
     * @return {number}
     */
    getEndLineNumber: function () {
        var exception = this;

        return exception.furthestMatchEnd === -1 ?
            -1 :
            getLineNumber(exception.text, exception.furthestMatchEnd);
    },

    /**
     * Fetches the furthest 0-based absolute offset that the parse reached before terminating
     *
     * @return {number}
     */
    getEndOffset: function () {
        return this.furthestMatchEnd;
    },

    /**
     * Fetches the furthest 0-based absolute offset that the parse reached before terminating
     *
     * @deprecated Use .getEndOffset()
     * @return {number}
     */
    getFurthestMatchEnd: function () {
        return this.getEndOffset();
    },

    /**
     * Fetches the 1-based line number that the parse reached before terminating
     *
     * @deprecated Use .getEndLineNumber() instead
     * @return {number}
     */
    getLineNumber: function () {
        return this.getEndLineNumber();
    },

    /**
     * Fetches the first 1-based line number that the parse reached before terminating
     *
     * @return {number}
     */
    getStartLineNumber: function () {
        var exception = this;

        return exception.furthestMatchStart === -1 ?
            -1 :
            getLineNumber(exception.text, exception.furthestMatchStart);
    },

    /**
     * Fetches the 0-based absolute offset of the furthest match that the parse reached before terminating,
     * at the level where it is relevant (entire parse for a general parse failure, or the component
     * where a modifier was defined for a custom failure)
     *
     * @return {number}
     */
    getStartOffset: function () {
        return this.furthestMatchStart;
    },

    /**
     * Fetches the entire source text string being parsed
     *
     * @return {string}
     */
    getText: function () {
        return this.text;
    },

    /**
     * Determines whether the parse failed due to unexpectedly reaching the end of the source string
     * (vs. terminating too early and leaving some of the string unparsed)
     *
     * @return {boolean}
     */
    unexpectedEndOfInput: function () {
        var exception = this;

        return exception.furthestMatchEnd === exception.text.length;
    }
});

module.exports = ParseException;
