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

function Rule(name, captureName, ifNoMatch, processor, options) {
    this.captureName = captureName;
    this.component = null;
    this.ifNoMatch = ifNoMatch;
    this.name = name;
    this.options = options;
    this.processor = processor;
}

_.extend(Rule.prototype, {
    match: function (text, offset, options) {
        var component,
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
            match.components = rule.processor(match.components);
        }

        return match;
    },

    setComponent: function (component) {
        this.component = component;
    }
});

module.exports = Rule;
