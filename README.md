Parsing
=======

[![Build Status](https://secure.travis-ci.org/asmblah/parsing.png?branch=master)](http://travis-ci.org/asmblah/parsing)

A JSON-esque grammar-based parser.

Getting started
---------------
```shell
$ npm install parsing
$ node
```
```javascript
/**
 * Based on this EBNF grammar
 * - from http://stackoverflow.com/questions/6805172/how-do-you-abstract-some-expression-to-bnf#answer-6805185
 *
 * AEXP => AS+
 * AS   => id ':=' EX1 ';'
 * EX1  => EX2 (('+' | '-') EX2)*
 * EX2  => EX3 (('*' | '/') EX3)*
 * EX3  => EX4 ('^' EX3)*
 * EX4  => ('+'|'-')? EX5
 * EX5  => id | number | '(' EX1 ')'
 */
var grammarSpec = {
    ignore: 'whitespace',
    rules: {
        'assign': /:=/,
        'character': /[;*\/^+-]/,
        'id': /[\w$][\w\d$]*/,
        'number': /\d(?:\.\d+)?/,
        'whitespace': /\s+/,
        'AEXP': {
            components: {name: 'assignment', oneOrMoreOf: 'AS'}
        },
        'AS': {
            components: [{name: 'target', what: 'id'}, 'assign', {name: 'expression', what: 'EX1'}, {'character': ';'}]
        },
        'EX1': {
            captureAs: 'EX',
            components: [{name: 'left', what: 'EX2'}, {name: 'right', zeroOrMoreOf: [{name: 'operator', oneOf: [{'character': '+'}, {'character': '-'}]}, {name: 'operand', what: 'EX2'}]}],
            ifNoMatch: {component: 'right', capture: 'left'}
        },
        'EX2': {
            captureAs: 'EX',
            components: [{name: 'left', what: 'EX3'}, {name: 'right', zeroOrMoreOf: [{name: 'operator', oneOf: [{'character': '*'}, {'character': '/'}]}, {name: 'operand', what: 'EX3'}]}],
            ifNoMatch: {component: 'right', capture: 'left'}
        },
        'EX3': {
            captureAs: 'EX',
            components: [{name: 'left', what: 'EX4'}, {name: 'right', zeroOrMoreOf: [{name: 'operator', what: {'character': '^'}}, {name: 'operand', rule: 'EX3'}]}],
            ifNoMatch: {component: 'right', capture: 'left'}
        },
        'EX4': {
            captureAs: 'EX',
            components: [{name: 'operator', optionally: {oneOf: [{'character': '+'}, {'character': '-'}]}}, {name: 'operand', what: 'EX5'}],
            ifNoMatch: {component: 'operator', capture: 'operand'}
        },
        'EX5': {
            components: [{oneOf: ['id', 'number', [{'character': '('}, 'EX1', {'character': ')'}]]}]
        }
    },
    start: 'AEXP'
};

var parser = require('parsing').create(grammarSpec);

console.log(parser.parse('waldo:=1;'));
/**
 * Gives:
 * {
 *     name: 'AEXP',
 *     assignment: [{
 *         name: 'AS',
 *         target: 'waldo',
 *         expression: '1'
 *     }]
 * }
 */
```

Keeping up to date
------------------
- [Follow me on Twitter](https://twitter.com/@asmblah) for updates: [https://twitter.com/@asmblah](https://twitter.com/@asmblah)
