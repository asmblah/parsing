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
    undef;

/**
 * Represents a single rule in the grammar
 *
 * @param {Parser} parser
 * @param {object} matchCache
 * @param {string} name
 * @param {string|null} captureName An optional different name to use for any matches for the rule
 * @param {Object|null} ifNoMatch
 * @param {Function|null} processor An optional custom callback to process any matches for the rule
 * @param {Object|null} options
 * @constructor
 */
function Rule(parser, matchCache, name, captureName, ifNoMatch, processor, options) {
    /**
     * @type {string|null}
     */
    this.captureName = captureName;
    /**
     * @type {Component|null}
     */
    this.component = null;
    /**
     * @type {Object|null}
     */
    this.ifNoMatch = ifNoMatch;
    /**
     * @type {Object}
     */
    this.matchCache = matchCache;
    /**
     * @type {string}
     */
    this.name = name;
    /**
     * @type {Object|null}
     */
    this.options = options;
    /**
     * @type {Parser}
     */
    this.parser = parser;
    /**
     * @type {Function|null}
     */
    this.processor = processor;
}

_.extend(Rule.prototype, {
    match: function (text, offset, options) {
        var capturedOffset,
            component,
            rule = this,
            match = rule.matchCache[offset];

        if (match !== undef) {
            return match;
        }

        options = options || {};

        match = rule.component.match(text, offset, options);

        if (match === null) {
            // Record the fact that this rule did _not_ match, so we don't attempt to match it again
            rule.matchCache[offset] = null;

            return null;
        }

        if (typeof match.components === 'object') {
            copy(match.components, rule.options);
        }

        if (rule.ifNoMatch && (!(component = match.components[rule.ifNoMatch.component]) || component.length === 0)) {
            match = {
                components: match.components[rule.ifNoMatch.capture],
                textOffset: match.textOffset,
                textLength: match.textLength
            };
        } else {
            if (!_.isString(match.components) && !match.components.name) {
                match.components.name = rule.captureName || rule.name;
            }
        }

        if (rule.processor) {
            if (rule.component.getOffsetCaptureName()) {
                capturedOffset = match.components[rule.component.getOffsetCaptureName()];
            }

            match.components = rule.processor(match.components, function (text, options, startRule) {
                var reentrantMatch = rule.parser.parse(text, options, startRule);

                // Ensure we clear the cache after reentering the parser, as the parent parser "scope"
                // could be corrupted by using the cache from this nested match
                rule.parser.clearMatchCache();

                return reentrantMatch;
            });

            if (rule.component.getOffsetCaptureName()) {
                match.components[rule.component.getOffsetCaptureName()] = capturedOffset;
            }
        }

        rule.matchCache[offset] = match;

        return match;
    },

    setComponent: function (component) {
        this.component = component;
    }
});

module.exports = Rule;
