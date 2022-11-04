#!/usr/bin/env node

const importLocal = require('import-local');
const npmlog = require('npmlog');
const libs = require('../lib');

if (importLocal(__filename)) {
  npmlog.info('cli', '正在使用 pig-cli 本地版本');
} else {
  libs(process.argv.slice(2));
}
