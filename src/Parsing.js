'use strict';

var _ = require('lodash');

function Parsing(Parser) {
    this.Parser = Parser;
}

_.extend(Parsing.prototype, {
    create: function (grammarSpec, stderr) {
        return new this.Parser(grammarSpec, stderr);
    }
});

module.exports = Parsing;
