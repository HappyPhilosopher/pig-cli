'use strict';

const path = require('path');
const semver = require('semver');
const colors = require('colors/safe');
const userHome = require('user-home');
const pathExists = require('path-exists');

const pkg = require('../package.json');
const log = require('@pig-cli/log');
const constant = require('./const');

function core() {
	try {
		checkPkgVersion();
		checkNodeVersion();
		checkRoot();
		checkUserHome();
		checkInputArgs();
		checkEnv();
		checkGlobalUpdate();
	} catch (e) {
		log.error(e.message);
	}
}

module.exports = core;

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
	const rootCheck = require('root-check');
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
 * 检查输入的参数
 */
function checkInputArgs() {
	const minimist = require('minimist');
	const args = minimist(process.argv.slice(2));
	checkArgs(args);
}

/**
 * 检查参数
 * @param {Array} args
 */
function checkArgs(args) {
	process.env.LOG_LEVEL = args.debug ? 'verbose' : 'info';
	log.level = process.env.LOG_LEVEL;
}

/**
 * 检查环境变量
 */
function checkEnv() {
	const dotenv = require('dotenv');
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
function checkGlobalUpdate() {
	// 1. 获取当前版本号和模块名
	const currentVersion = pkg.version;
	const npmName = pkg.name;
	// 2. 调用npm API，获取所有版本号
	const { getNpmInfo } = require('@pig-cli/get-npm-info');
	getNpmInfo(npmName);
	// 3. 提取所有版本号，比对那些版本号是大于当前版本号
	
	// 4. 获取最新的版本号，提示用户更新到该版本
}
