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
    getColumnNumber = require('./getColumnNumber'),
    getLineNumber = require('./getLineNumber'),
    undef;

function Component(parser, matchCache, qualifierName, qualifier, arg, args, name, captureBoundsAs) {
    this.arg = arg;
    this.args = args;
    this.captureBoundsAs = args.captureBoundsAs || captureBoundsAs;
    this.matchCache = matchCache;
    this.name = name;
    this.parser = parser;
    this.qualifier = qualifier;
    this.qualifierName = qualifierName;
}

_.extend(Component.prototype, {
    getOffsetCaptureName: function () {
        return this.captureBoundsAs;
    },

    match: function (text, offset, options) {
        var component = this,
            match = component.matchCache[offset],
            subMatch;

        if (match !== undef) {
            return match;
        }

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

        subMatch = component.qualifier(text, offset, component.arg, component.args, options);

        if (subMatch === null) {
            component.matchCache[offset] = null;
            return null;
        }

        if (options.ignoreWhitespace !== false) {
            component.parser.logFurthestMatch(subMatch, offset + subMatch.textOffset);
        } else {
            component.parser.logFurthestIgnoreMatch(subMatch, offset + subMatch.textOffset);
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

        component.matchCache[offset] = match;

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
    var match;

    if (allElementsAreStrings(subMatch.components)) {
        match = {
            components: subMatch.components.join(''),
            textLength: subMatch.textLength
        };
    } else {
        match = {
            components: {},
            textLength: subMatch.textLength
        };
        _.each(subMatch.components, function (value) {
            if (_.isPlainObject(value)) {
                copy(match.components, value);
            }
        });

        if (component.captureBoundsAs && subMatch.components.length > 1) {
            match.components[component.captureBoundsAs] = {
                start: {
                    offset: offset + subMatch.textOffset,
                    line: getLineNumber(text, offset + subMatch.textOffset),
                    column: getColumnNumber(text, offset + subMatch.textOffset)
                },
                end: {
                    offset: offset + subMatch.textOffset + subMatch.textLength,
                    line: getLineNumber(text, offset + subMatch.textOffset + subMatch.textLength),
                    column: getColumnNumber(text, offset + subMatch.textOffset + subMatch.textLength)
                }
            };
        }
    }

    if (subMatch.name) {
        match.components.name = subMatch.name;
    }

    match.textOffset = subMatch.textOffset;

    return match;
}

function createSubMatch(text, subMatch, component, offset) {
    // Component is named: don't attempt to merge an array in
    var match = {
        components: {},
        isEmpty: subMatch.isEmpty || false,
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
        (function (offset) {
            match.components[component.captureBoundsAs] = {
                start: {
                    offset: offset,
                    line: getLineNumber(text, offset),
                    column: getColumnNumber(text, offset)
                },
                end: {
                    offset: offset + subMatch.textLength,
                    line: getLineNumber(text, offset + subMatch.textLength),
                    column: getColumnNumber(text, offset + subMatch.textLength)
                }
            };
        }(offset + match.textOffset));
    }

    return match;
}

module.exports = Component;
