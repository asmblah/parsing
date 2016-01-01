'use strict';

var _ = require('microdash');

function Parsing(Parser) {
    this.Parser = Parser;
}

_.extend(Parsing.prototype, {
    create: function (grammarSpec, stderr, options) {
        return new this.Parser(grammarSpec, stderr, options);
    }
});

module.exports = Parsing;
