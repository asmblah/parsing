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

function Component(parser, matchCache, qualifierName, qualifier, arg, args, name, options) {
    this.arg = arg;
    this.args = args;
    this.captureOffsetAs = args.captureOffsetAs || options.captureAllOffsetsAs;
    this.matchCache = matchCache;
    this.name = name;
    this.options = options;
    this.parser = parser;
    this.qualifier = qualifier;
    this.qualifierName = qualifierName;
}

_.extend(Component.prototype, {
    getOffsetCaptureName: function () {
        return this.captureOffsetAs;
    },

    match: function (text, offset, options) {
        var component = this,
            match = component.matchCache[offset],
            subMatch;

        if (match !== undef) {
            return match;
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

        if (component.name !== null || component.args.allowMerge === false || component.args.captureOffsetAs) {
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

        if (component.captureOffsetAs && subMatch.components.length > 1) {
            match.components[component.captureOffsetAs] = {
                length: subMatch.textLength,
                line: getLineNumber(text, offset + subMatch.textOffset),
                column: getColumnNumber(text, offset + subMatch.textOffset),
                offset: offset + subMatch.textOffset
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

    if (component.captureOffsetAs) {
        (function (offset) {
            match.components[component.captureOffsetAs] = {
                length: subMatch.textLength,
                line: getLineNumber(text, offset),
                column: getColumnNumber(text, offset),
                offset: offset
            };
        }(offset + match.textOffset));
    }

    return match;
}

module.exports = Component;
