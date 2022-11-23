const path = require('path');
const Package = require('@pig-cli/package');
const log = require('@pig-cli/log');

let pkg;
const SETTINGS = {
  init: '@pig-cli/init'
};
const CACHE_DIR = 'dependencies';

async function exec(...params) {
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME;
  log.verbose('====>targetPath: ', targetPath);
  log.verbose('====>homePath: ', homePath);
  const cmdObj = params[params.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = 'latest';
  let storeDir = '';

  // 生成缓存路径
  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, 'node_modules');
    log.verbose('===> targetPath: ', targetPath);
    log.verbose('===> storeDir: ', storeDir);

    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion
    });

    if (await pkg.exists()) {
      await pkg.update();
    } else {
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion
    });
  }

  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    require(rootFile)(...params);
  }
}

module.exports = exec;
