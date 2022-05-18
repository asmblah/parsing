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
    copy = require('./copy'),
    AbortException = require('./Exception/Abort'),
    ParseException = require('./Exception/Parse');

/**
 * Represents a term or group term in a grammar rule. The "root" of a rule
 * is also represented with a component.
 *
 * @param {Parser} parser
 * @param {Object} context
 * @param {string} qualifierName
 * @param {Function} qualifier
 * @param {*} arg
 * @param {Object} args
 * @param {string=} name
 * @param {string=} captureBoundsAs
 * @constructor
 */
function Component(
    parser,
    context,
    qualifierName,
    qualifier,
    arg,
    args,
    name,
    captureBoundsAs
) {
    /**
     * @type {*}
     */
    this.arg = arg;
    /**
     * @type {Object}
     */
    this.args = args;
    /**
     * @type {string|null}
     */
    this.captureBoundsAs = args.captureBoundsAs || captureBoundsAs;
    /**
     * @type {Object}
     */
    this.context = context;
    /**
     * @type {string|null}
     */
    this.name = name;
    /**
     * @type {Parser}
     */
    this.parser = parser;
    /**
     * @type {Function}
     */
    this.qualifier = qualifier;
    /**
     * @type {string}
     */
    this.qualifierName = qualifierName;
}

_.extend(Component.prototype, {
    /**
     * Fetches the name to be used to capture the bounds of this component
     *
     * @return {string|null}
     */
    getOffsetCaptureName: function () {
        return this.captureBoundsAs;
    },

    /**
     * Attempts to match this component at the given offset
     *
     * @param {string} text
     * @param {number} offset
     * @param {number} line
     * @param {number} lineOffset
     * @param {Object} options
     * @return {Object|null} Returns the match object on success or null on failure
     */
    match: function (text, offset, line, lineOffset, options) {
        var component = this,
            match,
            subMatch;

        // Cascade ignoreWhitespace down to descendants of this component
        if (component.args.ignoreWhitespace === false) {
            options = _.extend({}, options, {
                ignoreWhitespace: false
            });
        } else if (component.args.ignoreWhitespace === true) {
            options = _.extend({}, options, {
                ignoreWhitespace: true
            });
        }

        subMatch = component.qualifier(text, offset, line, lineOffset, component.arg, component.args, options);

        if (subMatch === null) {
            return null;
        }

        if (options.ignoreWhitespace !== false) {
            component.parser.logFurthestMatch(subMatch, offset + subMatch.textOffset);
        } else {
            component.parser.logFurthestIgnoreMatch(subMatch, offset + subMatch.textOffset);
        }

        if (component.args.modifier) {
            subMatch.components = component.args.modifier.call(
                null,
                subMatch.components,

                /**
                 * Parses a given string by reentering the parser.
                 * Note that the cache will be cleared which may affect performance.
                 *
                 * @param {string} text
                 * @param {Options=} options
                 * @param {string=} startRule
                 * @returns {Object}
                 */
                function subParse(text, options, startRule) {
                    var reentrantMatch = component.parser.parse(text, options, startRule);

                    // Ensure we clear the cache after reentering the parser, as the parent parser "scope"
                    // could be corrupted by using the cache from this nested match
                    component.parser.clearMatchCache();

                    return reentrantMatch;
                },

                /**
                 * Aborts the entire parse with a custom message and optional context
                 *
                 * @param {string} message
                 * @param {Object=} context
                 */
                function abort(message, context) {
                    var errorHandler = component.parser.getErrorHandler(),
                        error = new ParseException(
                            message,
                            text,
                            offset + subMatch.textOffset,
                            component.parser.getFurthestMatchEnd(),
                            context
                        ),
                        result;

                    if (!errorHandler) {
                        throw error;
                    }

                    result = errorHandler.handle(error);

                    // Most ErrorHandlers are expected to throw, but if a result is returned instead
                    // we throw this special Exception, which will be caught at the top level
                    // and ensure that this result is returned from Parser.parse() instead
                    throw new AbortException(message, result);
                },

                // Context is a user-defined object with any data for the modifier to use.
                component.context
            );

            if (subMatch.components === null) {
                // Match was explicitly failed by returning null from the modifier.
                return null;
            }
        }

        if (component.name !== null || component.args.allowMerge === false || component.args.captureBoundsAs) {
            match = createSubMatch(text, subMatch, component, offset);
        } else {
            // Component is not named: merge its captures in if an array
            if (_.isArray(subMatch.components)) {
                match = mergeCaptures(subMatch, component, text, offset);
            } else {
                match = subMatch;
            }
        }

        return match;
    }
});

function allElementsAreStrings(array) {
    var allStrings = true;
    _.each(array, function (element) {
        if (!_.isString(element)) {
            allStrings = false;
            return false;
        }
    });
    return allStrings;
}

function mergeCaptures(subMatch, component, text, offset) {
    var match = {
        firstLine: subMatch.firstLine,
        firstLineOffset: subMatch.firstLineOffset,
        lines: subMatch.lines,
        lastLine: subMatch.lastLine,
        lastLineOffset: subMatch.lastLineOffset,
        textOffset: subMatch.textOffset,
        textLength: subMatch.textLength
    };

    if (allElementsAreStrings(subMatch.components)) {
        match.components = subMatch.components.join('');
    } else {
        match.components = {};

        _.each(subMatch.components, function (value) {
            if (_.isPlainObject(value)) {
                copy(match.components, value);
            }
        });

        if (component.captureBoundsAs && subMatch.components.length > 1) {
            match.components[component.captureBoundsAs] = {
                start: {
                    offset: offset + subMatch.textOffset,
                    line: subMatch.firstLine + 1,
                    column: offset + subMatch.textOffset - subMatch.firstLineOffset + 1
                },
                end: {
                    offset: offset + subMatch.textOffset + subMatch.textLength,
                    line: subMatch.lastLine + 1,
                    column: offset + subMatch.textOffset + subMatch.textLength - subMatch.lastLineOffset + 1
                }
            };
        }
    }

    if (subMatch.name) {
        match.components.name = subMatch.name;
    }

    return match;
}

function createSubMatch(text, subMatch, component, offset) {
    // Component is named: don't attempt to merge an array in
    var startOffset = offset + subMatch.textOffset,
        match = {
            components: {},
            isEmpty: subMatch.isEmpty || false,
            firstLine: subMatch.firstLine,
            firstLineOffset: subMatch.firstLineOffset,
            lines: subMatch.lines,
            lastLine: subMatch.lastLine,
            lastLineOffset: subMatch.lastLineOffset,
            textLength: subMatch.textLength,
            textOffset: subMatch.textOffset
        };

    if (subMatch.name) {
        match.components.name = subMatch.name;
    }
    if (component.name !== null) {
        match.components[component.name] = subMatch.components;
    }

    if (component.captureBoundsAs) {
        match.components[component.captureBoundsAs] = {
            start: {
                offset: startOffset,
                line: subMatch.firstLine + 1,
                column: startOffset - subMatch.firstLineOffset + 1
            },
            end: {
                offset: startOffset + subMatch.textLength,
                line: subMatch.lastLine + 1,
                column: startOffset + subMatch.textLength - subMatch.lastLineOffset + 1
            }
        };
    }

    return match;
}

module.exports = Component;
