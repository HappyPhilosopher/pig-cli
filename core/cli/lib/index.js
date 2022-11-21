const path = require('path');
const semver = require('semver');
const colors = require('colors/safe');
const userHome = require('user-home');
const pathExists = require('path-exists');
const commander = require('commander');
const rootCheck = require('root-check');
const dotenv = require('dotenv');

const log = require('@pig-cli/log');
const init = require('@pig-cli/init');
const { getNpmSemverVersion } = require('@pig-cli/get-npm-info');
const pkg = require('../package.json');
const constant = require('./const');

const program = new commander.Command();

/**
 * 获取当前项目版本号
 */
function checkPkgVersion() {
  log.notice('===> current version: ', pkg.version);
}

/**
 * 获取 Node 版本号
 */
function checkNodeVersion() {
  const currentVersion = process.version;
  const lowestVersion = constant.LOWEST_NODE_VERSION;
  if (semver.lt(currentVersion, lowestVersion)) {
    throw new Error(colors.red(`pig-cli 需要安装 ${lowestVersion} 以上版本的 Node.js!`));
  }
}

/**
 * 校验当前环境是否为 root 账户
 */
function checkRoot() {
  rootCheck();
}

/**
 * 校验用户主目录是否存在
 */
function checkUserHome() {
  if (!userHome || !pathExists.sync(userHome)) {
    throw new Error(colors.red('当前登录页用户的主目录不存在！'));
  }
}

/**
 * 检查环境变量
 */
function checkEnv() {
  const dotenvPath = path.resolve(userHome, '.env');

  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath
    });
  }
  process.env.CLI_HOME = process.env.CLI_HOME || constant.DEFAULT_CLI_HOME;

  log.verbose('===> 环境变量: ', process.env.CLI_HOME);
}

/**
 * 检查并提示更新到最新版本
 */
async function checkGlobalUpdate() {
  const currentVersion = pkg.version;
  const npmName = pkg.name;

  const latestVersion = await getNpmSemverVersion(currentVersion, npmName);
  if (latestVersion && semver.gt(latestVersion, currentVersion)) {
    log.warn(
      '===> 更新提示',
      colors.yellow(
        `请手动更新 ${npmName}，当前版本：${currentVersion}，最新版本：${latestVersion}\n更新命令：npm install -g ${npmName}`
      )
    );
  }
}

/**
 * 预启动阶段
 */
async function prepare() {
  checkPkgVersion();
  checkNodeVersion();
  checkRoot();
  checkUserHome();
  checkEnv();
  await checkGlobalUpdate();
}

/**
 * 命令注册
 */
function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '');

  program.command('init [projectName]').option('-f, --force', '是否强制初始化项目', false).action(init);

  // 监听debug模式
  program.on('option:debug', () => {
    process.env.LOG_LEVEL = program.opts().debug ? 'verbose' : 'info';
    log.level = process.env.LOG_LEVEL;
  });

  // 监听 targetPath 并存入环境变量
  program.on('option:targetPath', () => {
    process.env.CLI_TARGET_PATH = program.opts().targetPath;
  });

  // 监听未知命令
  program.on('command:*', obj => {
    const availableCommands = program.commands.map(cmd => cmd.name());
    console.log(colors.red(`未知的命令：${obj[0]}`));
    if (availableCommands.length > 0) {
      console.log(colors.red(`可用命令：${availableCommands.join(',')}`));
    }
  });

  program.parse(process.argv);

  // 用户不输入任何参数时打印提示文档
  if (program.args && program.args.length < 1) {
    program.outputHelp();
    console.log(); // 换行，美观
  }
}

/**
 * 核心程序
 */
async function core() {
  try {
    await prepare();
    registerCommand();
  } catch (e) {
    log.error(e.message);
  }
}

module.exports = core;
