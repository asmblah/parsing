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
 * @param {Object|null} furthestMatch
 * @param {number} furthestMatchOffset
 * @param {Object|null} furthestIgnoreMatch
 * @param {number} furthestIgnoreMatchOffset
 * @constructor
 */
function ParseException(
    message,
    text,
    furthestMatch,
    furthestMatchOffset,
    furthestIgnoreMatch,
    furthestIgnoreMatchOffset
) {
    Exception.call(this, message);

    /**
     * @type {Object|null}
     */
    this.furthestIgnoreMatch = furthestIgnoreMatch;
    /**
     * @type {number}
     */
    this.furthestIgnoreMatchOffset = furthestIgnoreMatchOffset;
    /**
     * @type {Object|null}
     */
    this.furthestMatch = furthestMatch;
    /**
     * @type {number}
     */
    this.furthestMatchOffset = furthestMatchOffset;
    /**
     * @type {string}
     */
    this.text = text;
}

util.inherits(ParseException, Exception);

_.extend(ParseException.prototype, {
    /**
     * Fetches the furthest 0-based absolute offset that the parse reached before terminating
     *
     * @return {number}
     */
    getFurthestMatchEnd: function () {
        var exception = this;

        if (exception.furthestIgnoreMatchOffset > exception.furthestMatchOffset) {
            return exception.furthestIgnoreMatchOffset + exception.furthestIgnoreMatch.textLength;
        }

        return exception.furthestMatchOffset + (exception.furthestMatch ? exception.furthestMatch.textLength : 0);
    },

    /**
     * Fetches the 1-based line number that the parse reached before terminating
     *
     * @return {number}
     */
    getLineNumber: function () {
        var exception = this;

        return getLineNumber(exception.text, exception.getFurthestMatchEnd());
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

        return exception.getFurthestMatchEnd() === exception.text.length;
    }
});

module.exports = ParseException;
