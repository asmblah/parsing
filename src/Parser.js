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
    countNewlines = require('./countNewlines'),
    findLastNewlineFrom = require('./findLastNewlineFrom'),
    hasOwn = {}.hasOwnProperty,
    AbortException = require('./Exception/Abort'),
    Component = require('./Component'),
    Exception = require('./Exception/Exception'),
    ParseException = require('./Exception/Parse'),
    Rule = require('./Rule'),
    RuleComponent = require('./RuleComponent');

function Parser(grammarSpec, stderr, options) {
    var context;

    options = options || {};
    context = options.context || {};

    this.errorHandler = null;
    this.furthestIgnoreMatch = null;
    this.furthestIgnoreMatchOffset = -1;
    this.furthestMatch = null;
    this.furthestMatchOffset = -1;
    this.grammarSpec = grammarSpec;
    this.matchCaches = [];
    this.matchCacheCount = 0; // Separately store the count to avoid expensive .length lookups.
    this.matchCacheStack = [];
    this.options = options;
    this.rules = null;
    this.state = null;
    this.stderr = stderr;

    (function (parser) {
        // Ensure the regex can only match at the current parser position.
        // We use the sticky flag (y) so exec() matches at lastIndex without creating a substring.
        function anchorRegex(regex) {
            var flags = regex.toString().match(/[^\/]*$/)[0];
            var source = regex.source;

            // Remove a leading ^ if present; sticky already anchors to lastIndex,
            // and combining ^ with y would restrict matching to offset 0 only.
            if (source.charAt(0) === '^') {
                source = source.slice(1);
            }

            if (flags.indexOf('y') === -1) {
                flags += 'y';
            }

            return new RegExp(source, flags);
        }

        /*
         * Speed up repeated match tests in complex grammars by caching component matches.
         * Each cache is a holder object {cache: []} rather than a bare array so that
         * pushMatchCaches/popMatchCaches can swap the inner array in O(1) without any
         * per-entry copying, while Rule instances keep a stable reference to the holder.
         */
        function createMatchCache() {
            var matchCacheHolder = {cache: []};

            parser.matchCaches.push(matchCacheHolder);
            parser.matchCacheCount++;

            return matchCacheHolder;
        }

        /*
         * Caches the total whitespace-skip result (length + line counters) per starting offset.
         * Multiple terminal rules that attempt to match at the same offset each call skipWhitespace();
         * without this cache each call loops N+1 times through ignoreRule.match() even though
         * those results are individually cached at the Rule level. This reduces the per-offset
         * cost from O(terminals * whitespace-tokens) to O(1) after the first terminal is tried.
         */
        var whitespaceCache = createMatchCache();

        parser.whitespaceCache = whitespaceCache;

        var qualifiers = {
                // Like "(...)" grouping - 'arg' is an array of components that must all match
                'allOf': function (text, offset, line, lineOffset, arg, args, options) {
                    var component,
                        componentMatch,
                        firstLine = null,
                        firstLineOffset = null,
                        i,
                        length,
                        lines = 0,
                        lastLineOffset = lineOffset,
                        matches = [],
                        textLength = 0,
                        textOffset = null;

                    for (i = 0, length = arg.length; i < length; i++) {
                        component = arg[i];
                        componentMatch = component.match(
                            text,
                            offset + (textOffset || 0) + textLength,
                            line + lines,
                            lastLineOffset,
                            options
                        );

                        if (componentMatch === null) {
                            matches = null;
                            break;
                        }

                        matches.push(componentMatch.components);

                        if (componentMatch.isEmpty) {
                            // Empty matches are possible when an "optionally" qualifier is used,
                            // which must be treated specially as they should not fail the parent match.
                            continue;
                        }

                        if (firstLine === null) {
                            firstLine = componentMatch.firstLine;
                            firstLineOffset = componentMatch.firstLineOffset;
                        }

                        lines += componentMatch.lines;
                        lastLineOffset = componentMatch.lastLineOffset;
                        textLength += componentMatch.textLength;

                        if (textOffset === null) {
                            textOffset = componentMatch.textOffset;
                        } else {
                            textLength += componentMatch.textOffset;
                        }
                    }

                    if (firstLine === null) {
                        firstLine = 0;
                        firstLineOffset = 0;
                    }

                    return matches ? {
                        components: matches,
                        firstLine: firstLine,
                        firstLineOffset: firstLineOffset,
                        lines: lines,
                        lastLine: line + lines,
                        lastLineOffset: lastLineOffset,
                        textLength: textLength,
                        textOffset: textOffset || 0
                    } : null;
                },
                // Like "|" (alternation) - 'arg' is an array of components, one of which must match
                'oneOf': function (text, offset, line, lineOffset, arg, args, options) {
                    var component,
                        componentMatch,
                        i,
                        length,
                        match = null;

                    for (i = 0, length = arg.length; i < length; i++) {
                        component = arg[i];
                        componentMatch = component.match(text, offset, line, lineOffset, options);

                        if (componentMatch !== null) {
                            match = componentMatch;
                            break;
                        }
                    }

                    return match;
                },
                // Like "+" - 'arg' is a component, which must match one or more times consecutively
                'oneOrMoreOf': function (text, offset, line, lineOffset, arg, args, options) {
                    var componentMatch,
                        firstLine = null,
                        firstLineOffset = null,
                        lines = 0,
                        lastLineOffset = lineOffset,
                        matches = [],
                        textLength = 0,
                        textOffset = null;

                    while (
                        (
                            componentMatch = arg.match(
                                text,
                                offset + (textOffset || 0) + textLength,
                                line + lines,
                                lastLineOffset,
                                options
                            )
                        ) !== null
                    ) {
                        lines += componentMatch.lines;
                        lastLineOffset = componentMatch.lastLineOffset;
                        textLength += componentMatch.textLength;

                        if (componentMatch.components !== '') {
                            matches.push(componentMatch.components);
                        }

                        if (firstLine === null) {
                            firstLine = componentMatch.firstLine;
                            firstLineOffset = componentMatch.firstLineOffset;
                        }

                        if (textOffset === null) {
                            textOffset = componentMatch.textOffset;
                        } else {
                            textLength += componentMatch.textOffset;
                        }
                    }

                    if (firstLine === null) {
                        firstLine = 0;
                        firstLineOffset = 0;
                    }

                    return matches.length > 0 ? {
                        components: matches,
                        firstLine: firstLine,
                        firstLineOffset: firstLineOffset,
                        lines: lines,
                        lastLine: line + lines,
                        lastLineOffset: lastLineOffset,
                        textLength: textLength,
                        textOffset: textOffset || 0
                    } : null;
                },
                // Like "?" - 'arg' is a component which may or may not match
                'optionally': function (text, offset, line, lineOffset, arg, args, options) {
                    var match = arg.match(text, offset, line, lineOffset, options);

                    if (match) {
                        if (args.wrapInArray) {
                            return {
                                components: [match.components],
                                firstLine: match.firstLine,
                                firstLineOffset: match.firstLineOffset,
                                lines: match.lines,
                                lastLine: match.lastLine,
                                lastLineOffset: match.lastLineOffset,
                                textLength: match.textLength,
                                textOffset: match.textOffset
                            };
                        }

                        return match;
                    }

                    return {
                        isEmpty: true,
                        components: args.wrapInArray ? [] : '',
                        firstLine: line,
                        firstLineOffset: lineOffset,
                        lines: 0,
                        lastLine: line,
                        lastLineOffset: lineOffset,
                        textLength: 0,
                        textOffset: 0
                    };
                },
                // Refers to another rule
                'rule': function (text, offset, line, lineOffset, arg, args, options) {
                    var expectedText = args.text !== undefined ? args.text : null,
                        match = arg.match(text, offset, line, lineOffset, options);

                    if (match === null) {
                        return null;
                    }

                    return (expectedText === null || text.substr(offset + match.textOffset, match.textLength) === expectedText) ? match : null;
                },
                // Matches a regex, constant string, another rule or calls a callback for a dynamic match
                'what': function (text, offset, line, lineOffset, arg, args, options) {
                    var captureIndex,
                        lines,
                        match,
                        result,
                        whitespaceLength = 0,
                        whitespaceLines = 0,
                        whitespaceLastLineOffset = lineOffset;

                    function skipWhitespace() {
                        var match,
                            whitespaceCacheEntry;

                        if (parser.ignoreRule && options.ignoreWhitespace !== false && args.ignoreWhitespace !== false) {
                            whitespaceCacheEntry = whitespaceCache.cache[offset];

                            if (whitespaceCacheEntry !== undefined) {
                                // Efficiently skip the entire cached whitespace token run.
                                whitespaceLength = whitespaceCacheEntry.length;
                                whitespaceLines = whitespaceCacheEntry.lines;
                                whitespaceLastLineOffset = whitespaceCacheEntry.lastLineOffset;

                                return;
                            }

                            // Prevent infinite recursion of whitespace skipper
                            while (
                                (
                                    match = parser.ignoreRule.match(
                                        text,
                                        offset + whitespaceLength,
                                        line + whitespaceLines,
                                        whitespaceLastLineOffset,
                                        {ignoreWhitespace: false}
                                    )
                                )
                            ) {
                                whitespaceLines += match.lines;
                                whitespaceLastLineOffset = match.lastLineOffset;
                                whitespaceLength += match.textLength;
                            }

                            whitespaceCache.cache[offset] = {
                                length: whitespaceLength,
                                lines: whitespaceLines,
                                lastLineOffset: whitespaceLastLineOffset
                            };
                        }
                    }

                    function replace(string) {
                        var length,
                            replacements,
                            replaceIndex;

                        if (args.replace) {
                            replacements = args.replace;

                            for (replaceIndex = 0, length = replacements.length; replaceIndex < length; replaceIndex++) {
                                string = string.replace(replacements[replaceIndex].pattern, replacements[replaceIndex].replacement);
                            }
                        }

                        return string;
                    }

                    if (typeof arg === 'string') {
                        skipWhitespace();

                        if (text.substr(offset + whitespaceLength, arg.length) === arg) {
                            lines = countNewlines(arg);

                            return {
                                components: arg,
                                // First line should be the first line _after_ any skipped leading whitespace
                                firstLine: line + whitespaceLines,
                                firstLineOffset: whitespaceLastLineOffset,
                                // Lines should be the total no. of lines _including_ whitespace
                                lines: whitespaceLines + lines,
                                lastLine: line + whitespaceLines + lines,
                                lastLineOffset: findLastNewlineFrom(text, offset + whitespaceLength + arg.length - 1),
                                textLength: arg.length,
                                textOffset: whitespaceLength
                            };
                        }
                    } else if (arg instanceof RegExp) {
                        skipWhitespace();

                        // Use the sticky flag set by anchorRegex: match at the exact position
                        // without allocating a substring on every attempt.
                        arg.lastIndex = offset + whitespaceLength;
                        match = arg.exec(text);

                        if (match) {
                            captureIndex = args.captureIndex || 0;
                            lines = countNewlines(match[0]);

                            return {
                                components: replace(match[captureIndex]),

                                // First line should be the first line _after_ any skipped leading whitespace
                                firstLine: line + whitespaceLines,
                                firstLineOffset: whitespaceLastLineOffset,
                                // Lines should be the total no. of lines _including_ whitespace
                                lines: whitespaceLines + lines,
                                lastLine: line + whitespaceLines + lines,
                                // NB: All regexes are anchored, so we can rely on the last newline position
                                //     in the matched substring like this
                                lastLineOffset: findLastNewlineFrom(text, offset + whitespaceLength + match[0].length - 1),

                                // Always return the entire match length even though we may have only captured part of it
                                textLength: match[0].length,
                                textOffset: whitespaceLength
                            };
                        }
                    } else if (arg instanceof Component || arg instanceof RuleComponent) {
                        result = arg.match(text, offset, line, lineOffset, options);

                        if (typeof result === 'string') {
                            result = replace(result);
                        } else if (result && typeof result.components === 'string') {
                            result.components = replace(result.components);
                        }

                        return result;
                    } else if (typeof arg === 'function') {
                        // Used by eg. the special <BOF> and <EOF> rules
                        skipWhitespace();

                        return arg(
                            text,
                            offset,
                            whitespaceLength,
                            whitespaceLines,
                            line + whitespaceLines,
                            whitespaceLastLineOffset,
                            options
                        );
                    } else {
                        throw new Exception('Parser "what" qualifier :: Invalid argument "' + arg + '"');
                    }

                    return null;
                },
                // Like "*".
                'zeroOrMoreOf': function (text, offset, line, lineOffset, arg, args, options) {
                    var componentMatch,
                        firstLine = null,
                        firstLineOffset = null,
                        lines = 0,
                        lastLineOffset = lineOffset,
                        matches = [],
                        textLength = 0,
                        textOffset = null;

                    while (
                        (
                            componentMatch = arg.match(
                                text,
                                offset + (textOffset || 0) + textLength,
                                line + lines,
                                lastLineOffset,
                                options
                            )
                        ) !== null
                    ) {
                        lines += componentMatch.lines;
                        lastLineOffset = componentMatch.lastLineOffset;
                        textLength += componentMatch.textLength;

                        if (componentMatch.components !== '') {
                            matches.push(componentMatch.components);
                        }

                        if (firstLine === null) {
                            firstLine = componentMatch.firstLine;
                            firstLineOffset = componentMatch.firstLineOffset;
                        }

                        if (textOffset === null) {
                            textOffset = componentMatch.textOffset;
                        } else {
                            textLength += componentMatch.textOffset;
                        }
                    }

                    if (firstLine === null) {
                        firstLine = 0;
                        firstLineOffset = 0;
                    }

                    return {
                        components: matches,
                        firstLine: firstLine,
                        firstLineOffset: firstLineOffset,
                        lines: lines,
                        lastLine: line + lines,
                        lastLineOffset: lastLineOffset,
                        textLength: textLength,
                        textOffset: textOffset || 0
                    };
                }
            },
            originalRules = {},
            rules = {};

        // Special BeginningOfFile rule
        rules['<BOF>'] = new Rule(parser, context, createMatchCache(), '<BOF>', null, null);
        rules['<BOF>'].setComponent(new Component(parser, context, 'what', qualifiers.what, function (
            text,
            offset,
            textOffset,
            textOffsetLines,
            firstLine,
            firstLineOffset
        ) {
            return offset === 0 ? {
                components: '',

                // First line should be the first line _after_ any skipped leading whitespace
                firstLine: firstLine,
                firstLineOffset: firstLineOffset,
                // Lines should be the total no. of lines _including_ whitespace
                lines: textOffsetLines,
                lastLine: firstLine,
                lastLineOffset: findLastNewlineFrom(text, offset + textOffset),

                textLength: 0,
                textOffset: textOffset
            } : null;
        }, {}, null));

        // Special EndOfFile rule
        rules['<EOF>'] = new Rule(parser, context, createMatchCache(), '<EOF>', null, null);
        rules['<EOF>'].setComponent(new Component(parser, context, 'what', qualifiers.what, function (
            text,
            offset,
            textOffset,
            textOffsetLines,
            firstLine,
            firstLineOffset
        ) {
            return offset + textOffset === text.length ? {
                components: '',

                // First line should be the first line _after_ any skipped leading whitespace
                firstLine: firstLine,
                firstLineOffset: firstLineOffset,
                // Lines should be the total no. of lines _including_ whitespace
                lines: textOffsetLines,
                lastLine: firstLine,
                lastLineOffset: findLastNewlineFrom(text, offset + textOffset),

                textLength: 0,
                textOffset: textOffset
            } : null;
        }, {}, null));

        // Go through and create objects for all rules in this grammar first so we can set up circular references
        function createRule(ruleSpec, name) {
            return new Rule(
                parser,
                context,
                createMatchCache(),
                name,
                ruleSpec.captureAs || null,
                ruleSpec.ifNoMatch || null,
                ruleSpec.processor || null,
                ruleSpec.options || null
            );
        }
        _.each(grammarSpec.rules, function (ruleSpec, name) {
            var rule = createRule(ruleSpec, name);

            // Store 'original' rules here too, as rules may be overridden by options
            originalRules[name] = rule;
            rules[name] = rule;
        });
        _.each(options.rules || {}, function (ruleSpec, name) {
            // Create custom rule objects
            rules[name] = createRule(ruleSpec, name);
        });

        function defineRule(ruleSpec, ruleName, rules, selfReferencingRuleMap) {
            function createComponent(componentSpec) {
                var arg,
                    args = {},
                    captureBoundsAs,
                    name = null,
                    qualifierName = null;

                // Component is a group
                if (_.isArray(componentSpec)) {
                    qualifierName = 'allOf';
                    arg = [];
                    _.each(componentSpec, function (componentSpec, index) {
                        arg[index] = createComponent(componentSpec);
                    });
                // Component is the name of another rule
                } else if (_.isString(componentSpec)) {
                    qualifierName = 'rule';
                    arg = rules[componentSpec];

                    if (!arg) {
                        throw new Exception('Parser :: Invalid component - no rule with name "' + componentSpec + '" exists');
                    }
                // Component is a regex terminal
                } else if (componentSpec instanceof RegExp) {
                    componentSpec = anchorRegex(componentSpec);

                    qualifierName = 'what';
                    arg = componentSpec;
                } else if (_.isPlainObject(componentSpec)) {
                    _.each(qualifiers, function (qualifier, name) {
                        var value;
                        if (hasOwn.call(componentSpec, name)) {
                            value = componentSpec[name];
                            qualifierName = name;

                            if (qualifierName === 'oneOf') {
                                arg = [];
                                _.each(value, function (value, index) {
                                    arg[index] = createComponent(value);
                                });
                            } else if (qualifierName === 'optionally') {
                                arg = createComponent(value);
                            } else {
                                arg = (value instanceof RegExp) ? anchorRegex(value) : createComponent(value);
                            }

                            // Qualifier found, stop searching
                            return false;
                        }
                    });

                    if (!qualifierName) {
                        if (Object.keys(componentSpec).length !== 1) {
                            throw new Exception('Parser :: Invalid component - no valid qualifier referenced by spec: ' + JSON.stringify(componentSpec));
                        }

                        (function () {
                            var name = Object.keys(componentSpec)[0];
                            qualifierName = 'rule';

                            arg = rules[name];

                            if (!arg) {
                                throw new Exception('Parser :: Invalid component - no rule with name "' + name + '" exists');
                            }
                            args.text = componentSpec[name];
                        }());
                    }

                    // Pull all arguments out of component spec, excluding the qualifier itself and name (if specified)
                    _.each(componentSpec, function (value, name) {
                        if (name !== qualifierName && name !== 'name') {
                            args[name] = value;
                        }
                    });

                    // Get component name if specified
                    if (hasOwn.call(componentSpec, 'name')) {
                        name = componentSpec.name;
                    }
                } else {
                    throw new Exception('Parser :: Invalid componentSpec "' + componentSpec + '" specified');
                }

                // Custom rule refers to the original in grammar spec
                if (
                    qualifierName === 'rule' &&
                    arg.name === ruleName &&
                    hasOwn.call(selfReferencingRuleMap, ruleName)
                ) {
                    arg = selfReferencingRuleMap[ruleName];
                }

                if (!qualifiers[qualifierName]) {
                    throw new Exception('Parser :: Invalid component - qualifier name "' + qualifierName + '" is invalid');
                }

                captureBoundsAs = parser.options.captureAllBounds ?
                    grammarSpec.bounds || 'bounds' :
                    null;

                return (
                    qualifierName === 'rule' &&
                    name === null &&
                    args.ignoreWhitespace === undefined &&
                    !args.modifier &&
                    !args.captureBoundsAs &&
                    args.allowMerge !== false &&
                    args.text === undefined &&
                    !arg.ifNoMatch
                ) ?
                    // For simple components that refer to a rule, use an efficient variant
                    // that skips the branching logic inside Component.
                    new RuleComponent(
                        arg,
                        captureBoundsAs
                    ) :
                    new Component(
                        parser,
                        context,
                        qualifierName,
                        qualifiers[qualifierName],
                        arg,
                        args,
                        name,
                        captureBoundsAs
                    );
            }

            rules[ruleName].setComponent(createComponent(ruleSpec.components || ruleSpec));
        }

        _.each(grammarSpec.rules, function (ruleSpec, ruleName) {
            if (hasOwn.call(options.rules || {}, ruleName)) {
                // Rule has been overridden: initialise its rule object in `originalRules`,
                // as any references of an overridden rule to itself will actually refer
                // back to the original rule and not the one built from the new, overridden spec.
                defineRule(ruleSpec, ruleName, originalRules, rules);
                return;
            }

            defineRule(ruleSpec, ruleName, rules, rules);
        });
        _.each(options.rules || {}, function (ruleSpec, ruleName) {
            defineRule(ruleSpec, ruleName, rules, originalRules);
        });

        parser.rules = rules;
        parser.ignoreRule = rules[grammarSpec.ignore] || null;
        parser.startRule = rules[grammarSpec.start];
    }(this));
}

_.extend(Parser.prototype, {
    /**
     * Clears the match cache for all rules of the loaded grammar.
     */
    clearMatchCache: function () {
        var caches = this.matchCaches, i, length;

        for (i = 0, length = caches.length; i < length; i++) {
            caches[i].cache.length = 0;
        }
    },

    getErrorHandler: function () {
        var parser = this;

        if (!parser.errorHandler && parser.grammarSpec.ErrorHandler) {
            parser.errorHandler = new parser.grammarSpec.ErrorHandler(parser.stderr, parser.getState());
        }

        return parser.errorHandler;
    },

    /**
     * Fetches the 0-based offset into the input string at the end
     * of the furthest match into the string
     *
     * @returns {number}
     */
    getFurthestMatchEnd: function () {
        var parser = this;

        if (parser.furthestIgnoreMatchOffset > parser.furthestMatchOffset) {
            return parser.furthestIgnoreMatchOffset + parser.furthestIgnoreMatch.textLength;
        }

        return parser.furthestMatchOffset + (parser.furthestMatch ? parser.furthestMatch.textLength : 0);
    },

    /**
     * Fetches the 0-based offset into the input string at the start
     * of the furthest match into the string
     *
     * @returns {number}
     */
    getFurthestMatchStart: function () {
        var parser = this;

        if (parser.furthestIgnoreMatchOffset > parser.furthestMatchOffset) {
            return parser.furthestIgnoreMatchOffset;
        }

        return parser.furthestMatchOffset;
    },

    /**
     * Fetches the current match-cache stack.
     * Will be empty when not inside a nested parse.
     *
     * @returns {Array}
     */
    getMatchCacheStack: function () {
        return this.matchCacheStack;
    },

    getState: function () {
        var parser = this;

        if (!parser.state && parser.grammarSpec.State) {
            parser.state = new parser.grammarSpec.State();
        }

        return parser.state;
    },

    logFurthestIgnoreMatch: function (match, offset) {
        var parser = this;

        if (offset >= parser.furthestIgnoreMatchOffset && match.textLength > 0) {
            parser.furthestIgnoreMatch = match;
            parser.furthestIgnoreMatchOffset = offset;
        }
    },

    logFurthestMatch: function (match, offset) {
        var parser = this;

        if (offset >= parser.furthestMatchOffset && match.textLength > 0) {
            parser.furthestMatch = match;
            parser.furthestMatchOffset = offset;
        }
    },

    /**
     * Parses the given input text using the loaded grammar, optionally from a given start/entry rule
     *
     * @param {string} text
     * @param {Object} options
     * @param {string=} startRule
     * @return {Object}
     */
    parse: function (text, options, startRule) {
        var parser = this,
            error,
            errorHandler = parser.getErrorHandler(),
            furthestMatchEnd,
            rule = startRule ?
                parser.rules[startRule] :
                parser.startRule,
            match,
            matchEnd = 0,
            matchLine,
            matchLastLineOffset,
            matchStart,
            message,
            whitespaceMatch;

        parser.clearMatchCache();

        parser.furthestIgnoreMatch = null;
        parser.furthestIgnoreMatchOffset = -1;
        parser.furthestMatch = null;
        parser.furthestMatchOffset = -1;

        try {
            match = rule.match(text, 0, 0, 0, options);

            if (match) {
                matchLine = match.lines;
                matchLastLineOffset = match.textOffset + match.lastLineOffset;
                matchEnd = match.textOffset + match.textLength;

                // Skip any trailing whitespace if the grammar specifies it
                if (parser.ignoreRule) {
                    while (
                        (whitespaceMatch = parser.ignoreRule.match(
                            text,
                            matchEnd,
                            matchLine,
                            matchLastLineOffset,
                            // Prevent infinite recursion of whitespace skipper
                            {ignoreWhitespace: false})
                        )
                    ) {
                        matchLine += whitespaceMatch.lines;
                        matchLastLineOffset += match.lastLineOffset;
                        matchEnd += whitespaceMatch.textOffset + whitespaceMatch.textLength;
                    }
                }
            }
        } catch (error) {
            if (!(error instanceof AbortException)) {
                throw error;
            }

            // The custom ErrorHandler returned a result rather than throwing, so return it from here
            return error.getResult();
        }

        if (match === null || matchEnd < text.length) {
            // Determine the furthest offset the parser managed to parse to
            furthestMatchEnd = parser.getFurthestMatchEnd();

            if (furthestMatchEnd === -1) {
                matchStart = -1;
                message = 'No match';
            } else {
                matchStart = match ? match.textOffset : parser.getFurthestMatchStart();

                if (furthestMatchEnd === text.length) {
                    message = 'Unexpected end of file';
                } else {
                    message = 'Unexpected "' + text.charAt(furthestMatchEnd) + '"';
                }
            }

            error = new ParseException(
                'Parser.parse() :: ' + message,
                text,
                matchStart,
                furthestMatchEnd,
                {}
            );

            if (!errorHandler) {
                throw error;
            }

            return errorHandler.handle(error);
        }

        return match.components;
    },

    /**
     * Restores the match-cache arrays and furthest-match cursors from the top of the stack,
     * discarding any entries written by the nested parse.
     */
    popMatchCaches: function () {
        var parser = this,
            saved = parser.matchCacheStack.pop(),
            savedCaches = saved.caches,
            caches = parser.matchCaches,
            i,
            length;

        for (i = 0, length = caches.length; i < length; i++) {
            caches[i].cache = savedCaches[i];
        }

        parser.furthestIgnoreMatch = saved.furthestIgnoreMatch;
        parser.furthestIgnoreMatchOffset = saved.furthestIgnoreMatchOffset;
        parser.furthestMatch = saved.furthestMatch;
        parser.furthestMatchOffset = saved.furthestMatchOffset;
    },

    /**
     * Saves the current match-cache arrays and furthest-match cursors onto an internal stack,
     * replacing each holder's array with a fresh empty one for the nested parse to use.
     *
     * Must be paired with a popMatchCaches() call (ideally in a try/finally).
     */
    pushMatchCaches: function () {
        var parser = this,
            caches = parser.matchCaches,
            savedCaches = new Array(parser.matchCacheCount),
            i,
            length;

        for (i = 0, length = parser.matchCacheCount; i < length; i++) {
            savedCaches[i] = caches[i].cache;
            caches[i].cache = [];
        }

        parser.matchCacheStack.push({
            caches: savedCaches,
            furthestIgnoreMatch: parser.furthestIgnoreMatch,
            furthestIgnoreMatchOffset: parser.furthestIgnoreMatchOffset,
            furthestMatch: parser.furthestMatch,
            furthestMatchOffset: parser.furthestMatchOffset
        });
    },
});

module.exports = Parser;
