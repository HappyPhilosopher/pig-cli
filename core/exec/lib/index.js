const path = require('path');
const { cloneDeep } = require('lodash');
const Package = require('@pig-cli/package');
const log = require('@pig-cli/log');
const { spawnUtil } = require('@pig-cli/utils');

let pkg;
const SETTINGS = {
  init: '@pig-cli/init'
};
const CACHE_DIR = 'dependencies';

/**
 * 执行程序
 * @param  {...any} params
 */
async function exec(...params) {
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME;
  log.verbose('====> targetPath: ', targetPath);
  log.verbose('====> homePath: ', homePath);
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
    try {
      // require(rootFile)(params);
      // 在node子进程中调用
      const cloneParams = cloneDeep(params);
      const cmd = cloneParams[cloneParams.length - 1];
      const o = Object.create(null);
      Object.keys(cmd).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(cmd, key) && !key.startsWith('_') && key !== 'parent') {
          o[key] = cmd[key];
        }
      });
      cloneParams[cloneParams.length - 1] = o;
      const code = `require('${rootFile}')(${JSON.stringify(cloneParams)})`;
      const child = spawnUtil('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit'
      });
      child.on('error', err => {
        log.error(err.message);
        // 返回一个错误结果
        process.exit(1);
      });
      child.on('exit', e => {
        log.verbose('命令执行成功：', e);
        process.exit(e);
      });
    } catch (err) {
      log.error(err.message);
    }
  }
}

module.exports = exec;
