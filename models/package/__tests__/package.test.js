const assert = require('assert').strict;
const testPackage = require('..');

assert.strictEqual(testPackage(), 'Hello from package');
console.info('package tests passed');
