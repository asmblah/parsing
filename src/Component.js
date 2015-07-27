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
    copy = require('./copy'),
    getLineNumber = require('./getLineNumber'),
    undef;

function Component(parser, matchCache, qualifierName, qualifier, arg, args, name) {
    this.arg = arg;
    this.args = args;
    this.matchCache = matchCache;
    this.name = name;
    this.parser = parser;
    this.qualifier = qualifier;
    this.qualifierName = qualifierName;
}

_.extend(Component.prototype, {
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
            match = createSubMatch(text, match, subMatch, component, offset);
        } else {
            // Component is not named: merge its captures in if an array
            if (_.isArray(subMatch.components)) {
                match = mergeCaptures(match, subMatch);
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

function mergeCaptures(match, subMatch) {
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
    }

    if (subMatch.name) {
        match.components.name = subMatch.name;
    }

    match.textOffset = subMatch.textOffset;

    return match;
}

function createSubMatch(text, match, subMatch, component, offset) {
    // Component is named: don't attempt to merge an array in
    match = {
        components: {},
        textLength: subMatch.textLength,
        textOffset: subMatch.textOffset
    };
    if (subMatch.name) {
        match.components.name = subMatch.name;
    }
    if (component.name !== null) {
        match.components[component.name] = subMatch.components;
    }

    if (component.args.captureOffsetAs) {
        (function (offset) {
            match.components[component.args.captureOffsetAs] = {
                line: getLineNumber(text, offset),
                offset: offset
            };
        }(offset + match.textOffset));
    }

    return match;
}

module.exports = Component;
