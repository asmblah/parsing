/*
 * Parsing - JSON grammar-based parser
 * Copyright (c) Dan Phillimore (asmblah)
 * http://asmblah.github.com/parsing/
 *
 * Released under the MIT license
 * https://github.com/asmblah/parsing/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

/**
 * Used for efficiency when a component is a simple rule reference.
 *
 * @param {Rule} rule
 * @param {string|null} captureBoundsAs
 * @constructor
 */
function RuleComponent(
    rule,
    captureBoundsAs
) {
    /**
     * @type {string|null}
     */
    this.captureBoundsAs = captureBoundsAs;
    /**
     * @type {Rule}
     */
    this.rule = rule;
}

_.extend(RuleComponent.prototype, {
    /**
     * Fetches the name to be used to capture the bounds of this component.
     *
     * @return {string|null}
     */
    getOffsetCaptureName: function () {
        return this.captureBoundsAs;
    },

    /**
     * Attempts to match this component at the given offset.
     *
     * @param {string} text
     * @param {number} offset
     * @param {number} line
     * @param {number} lineOffset
     * @param {Object} options
     * @return {Object|null} Returns the match object on success or null on failure.
     */
    match: function (text, offset, line, lineOffset, options) {
        return this.rule.match(text, offset, line, lineOffset, options);
    }
});

module.exports = RuleComponent;
