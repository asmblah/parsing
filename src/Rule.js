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
    deepFreeze = require('./deepFreeze'),
    undef,
    AbortException = require('./Exception/Abort'),
    ParseException = require('./Exception/Parse');

/**
 * Represents a single rule in the grammar.
 *
 * @param {Parser} parser
 * @param {Object} context
 * @param {object} matchCache
 * @param {string} name
 * @param {string|null} captureName An optional different name to use for any matches for the rule
 * @param {Object|null} ifNoMatch
 * @param {Function|null} processor An optional custom callback to process any matches for the rule
 * @param {Object|null} options
 * @constructor
 */
function Rule(
    parser,
    context,
    matchCache,
    name,
    captureName,
    ifNoMatch,
    processor,
    options
) {
    /**
     * @type {string|null}
     */
    this.captureName = captureName;
    /**
     * @type {Component|null}
     */
    this.component = null;
    /**
     * @type {Object}
     */
    this.context = context;
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
    /**
     * Attempts to match this rule at the given offset into the string.
     *
     * @param {string} text
     * @param {number} offset 0-based absolute offset into the string to match at
     * @param {number} line 0-based number of the current line
     * @param {number} lineOffset 0-based absolute offset of the start of the current line
     * @param {Object} options
     * @return {Object|null}
     */
    match: function (text, offset, line, lineOffset, options) {
        var component,
            rule = this,
            matchCache = rule.matchCache.cache,
            match = matchCache[offset];

        /*
         * Left-recursion is handled by initially storing `true` in the match cache.
         * If `true` is fetched back, we have detected a cycle,
         * so we mark this match as a failure by returning null.
         *
         * This will cause a parent oneOf alternation to try the next alternative, for example.
         */
        if (match === true) {
            match = undef;

            matchCache[offset] = null;
        } else if (match === undef) {
            matchCache[offset] = true;
        } else {
            // Cache hit: the processed form is stored directly, so return it as-is.
            // Processors are not re-run on backtracking.
            return match;
        }

        options = options || {};

        match = rule.component.match(text, offset, line, lineOffset, options);

        if (match === null) {
            // Record the fact that this rule did _not_ match, so we don't attempt to match it again
            matchCache[offset] = null;

            return null;
        }

        if (typeof match.components === 'object') {
            copy(match.components, rule.options);
        }

        if (rule.ifNoMatch && (!(component = match.components[rule.ifNoMatch.component]) || component.length === 0)) {
            match = {
                components: match.components[rule.ifNoMatch.capture],
                firstLine: match.firstLine,
                firstLineOffset: match.firstLineOffset,
                lines: match.lines,
                lastLine: match.lastLine,
                lastLineOffset: match.lastLineOffset,
                textOffset: match.textOffset,
                textLength: match.textLength
            };
        } else {
            if (typeof match.components !== 'string' && !match.components.name) {
                match.components.name = rule.captureName || rule.name;
            }
        }

        if (rule.processor) {
            // Run the processor before caching so the final processed form is stored.
            // deepFreeze inside applyProcessor still protects sub-rule cache entries
            // from mutation. Storing the processed form means cache hits return it
            // directly with no re-run - including correct behaviour for context-dependent
            // processors that consume context state (e.g. yieldEncountered).
            var processedMatch = applyProcessor(rule, match, text, offset);

            matchCache[offset] = processedMatch; // Null if the processor explicitly failed the match.

            return processedMatch;
        }

        matchCache[offset] = match;

        return match;
    },

    /**
     * Sets the root component of this rule
     * (must be done via a setter to solve the circular dependency issue
     * when rules in the grammar are recursive).
     *
     * @param {Component} component
     */
    setComponent: function (component) {
        this.component = component;
    }
});

/**
 * Applies the rule's processor to the given raw (pre-processor) match.
 * The match's components are deep-frozen before being passed to the processor,
 * enforcing that processors must return new objects rather than mutating in place.
 * This protects any sub-rule results embedded in the components from mutation,
 * since those objects are shared with sub-rule cache entries.
 * Called only on cache misses; the processed result is cached so hits never re-run it.
 *
 * @param {Rule} rule
 * @param {Object} rawMatch
 * @param {string} text
 * @param {number} offset
 * @return {Object|null}
 */
function applyProcessor(rule, rawMatch, text, offset) {
    var boundsCaptureName = rule.component.getOffsetCaptureName(),
        capturedOffset,
        processedComponents,
        processedMatch;

    if (boundsCaptureName) {
        capturedOffset = rawMatch.components[boundsCaptureName];
    }

    // Freeze the structural form so the processor cannot mutate sub-rule cache entries
    // embedded in the components tree.
    deepFreeze(rawMatch.components);

    processedComponents = rule.processor.call(
        null,
        rawMatch.components,

        /**
         * Parses a given string by reentering the parser.
         * Note that the cache will be cleared which may affect performance.
         *
         * @param {string} subText
         * @param {Options=} subOptions
         * @param {string=} startRule
         * @returns {Object}
         */
        function subParse(subText, subOptions, startRule) {
            var reentrantMatch;

            // Save the parent parse's memoised results before the nested parse() call
            // clears the shared cache, then restore them afterwards.
            rule.parser.pushMatchCaches();

            try {
                reentrantMatch = rule.parser.parse(subText, subOptions, startRule);
            } finally {
                rule.parser.popMatchCaches();
            }

            return reentrantMatch;
        },

        /**
         * Aborts the entire parse with a custom message and optional context.
         *
         * @param {string} message
         * @param {Object=} context
         */
        function abort(message, context) {
            var errorHandler = rule.parser.getErrorHandler(),
                error = new ParseException(
                    message,
                    text,
                    offset + rawMatch.textOffset,
                    rule.parser.getFurthestMatchEnd(),
                    context
                ),
                result;

            if (!errorHandler) {
                throw error;
            }

            result = errorHandler.handle(error);

            // Most ErrorHandlers are expected to throw, but if a result is returned instead
            // we throw this special Exception, which will be caught at the top level
            // and ensure that this result is returned from Parser.parse() instead.
            throw new AbortException(message, result);
        },

        // Context is a user-defined object with any data for the processor to use.
        rule.context
    );

    if (processedComponents === null) {
        // Match was explicitly failed by returning null from the processor.
        return null;
    }

    processedMatch = {
        components: processedComponents,
        isEmpty: rawMatch.isEmpty || false,
        firstLine: rawMatch.firstLine,
        firstLineOffset: rawMatch.firstLineOffset,
        lines: rawMatch.lines,
        lastLine: rawMatch.lastLine,
        lastLineOffset: rawMatch.lastLineOffset,
        textLength: rawMatch.textLength,
        textOffset: rawMatch.textOffset
    };

    if (boundsCaptureName && processedMatch.components !== '') {
        processedMatch.components = Object.assign({}, processedMatch.components, {
            [boundsCaptureName]: capturedOffset
        });
    }

    return processedMatch;
}

module.exports = Rule;
