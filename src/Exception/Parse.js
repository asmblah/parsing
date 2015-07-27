/*
 * Parsing - JSON grammar-based parser
 * Copyright (c) Dan Phillimore (asmblah)
 * http://asmblah.github.com/parsing/
 *
 * Released under the MIT license
 * https://github.com/asmblah/parsing/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('lodash'),
    getLineNumber = require('./getLineNumber'),
    util = require('util'),
    Exception = require('./Exception');

function ParseException(
    message,
    text,
    furthestMatch,
    furthestMatchOffset,
    furthestIgnoreMatch,
    furthestIgnoreMatchOffset
) {
    Exception.call(this, message);

    this.furthestIgnoreMatch = furthestIgnoreMatch;
    this.furthestIgnoreMatchOffset = furthestIgnoreMatchOffset;
    this.furthestMatch = furthestMatch;
    this.furthestMatchOffset = furthestMatchOffset;
    this.text = text;
}

util.inherits(ParseException, Exception);

_.extend(ParseException.prototype, {
    getFurthestMatchEnd: function () {
        var exception = this;

        if (exception.furthestIgnoreMatchOffset > exception.furthestMatchOffset) {
            return exception.furthestIgnoreMatchOffset + exception.furthestIgnoreMatch.textLength;
        }

        return exception.furthestMatchOffset + exception.furthestMatch.textLength;
    },

    getLineNumber: function () {
        var exception = this;

        return getLineNumber(exception.text, exception.getFurthestMatchEnd());
    },

    getText: function () {
        return this.text;
    },

    unexpectedEndOfInput: function () {
        var exception = this;

        return exception.getFurthestMatchEnd() === exception.text.length;
    }
});

module.exports = ParseException;
