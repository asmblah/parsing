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
    copy = require('./copy');

function Rule(parser, name, captureName, ifNoMatch, processor, options) {
    this.captureName = captureName;
    this.component = null;
    this.ifNoMatch = ifNoMatch;
    this.name = name;
    this.options = options;
    this.parser = parser;
    this.processor = processor;
}

_.extend(Rule.prototype, {
    match: function (text, offset, options) {
        var capturedOffset,
            component,
            rule = this,
            match;

        options = options || {};

        match = rule.component.match(text, offset, options);

        if (match === null) {
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

        return match;
    },

    setComponent: function (component) {
        this.component = component;
    }
});

module.exports = Rule;
