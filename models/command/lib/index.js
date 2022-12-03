const semver = require('semver');
const colors = require('colors/safe');
const log = require('@pig-cli/log');

const LOWEST_NODE_VERSION = '12.0.0';

class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error('参数不能为空');
    }
    if (!Array.isArray(argv)) {
      throw new Error('参数必须为数组');
    }
    if (argv.length < 1) {
      throw new Error('参数列表为空');
    }

    this.argv = argv;
    // eslint-disable-next-line no-unused-vars
    const runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => Command.checkNodeVersion());
      chain = chain.then(() => this.initArgs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());
      chain.catch(err => {
        log.error(err);
      });
    });
  }

  init() {
    throw new Error('init必须实现');
  }

  exec() {
  }

  initArgs() {
    this.cmd = this.argv[this.argv.length - 1];
    this.argv = this.argv.slice(0, this.argv.length - 1);
  }

  /**
   * 获取 Node 版本号
   */
  static checkNodeVersion() {
    const currentVersion = process.version;
    const lowestVersion = LOWEST_NODE_VERSION;
    if (semver.lt(currentVersion, lowestVersion)) {
      throw new Error(colors.red(`pig-cli 需要安装 ${lowestVersion} 以上版本的 Node.js!`));
    }
  }
}

module.exports = Command;
