const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const inquirer = require('inquirer');
const fse = require('fs-extra');
const semver = require('semver');
const Command = require('@pig-cli/command');
const log = require('@pig-cli/log');
const Package = require('@pig-cli/package');
const { spinnerStart, sleep } = require('@pig-cli/utils');
const getProjectTemplate = require('./get-project-template');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';

class InitCommand extends Command {
  init() {
    const [projectName, { force }] = this.argv;
    this.projectName = projectName || '';
    this.force = force;
    log.verbose('===> projectName: ', this.projectName);
    log.verbose('===> force: ', this.force);
  }

  async exec() {
    try {
      // 1.准备阶段
      const projectInfo = await this.prepare();
      if (projectInfo) {
        // 2.下载模板
        log.verbose('===> projectInfo: ', projectInfo);
        this.projectInfo = projectInfo;
        await this.downloadTemplate();
        // 3.安装模板
      }
    } catch (err) {
      log.error(err.message);
    }
  }

  async prepare() {
    // 0.判断项目模板是否存在
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error('项目模板不存在');
    }
    this.template = template;
    const localPath = process.cwd();
    // 1.判断当前目录是否为空
    if (!InitCommand.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        // 1.1 询问是否继续创建
        ifContinue = (await inquirer.prompt({
          type: 'confirm',
          name: 'ifContinue',
          default: false,
          message: '当前文件夹不为空，是否继续创建项目？'
        })).ifContinue;
        if (!ifContinue) {
          return;
        }
      }

      if (ifContinue || this.force) {
        // 给用户做二次确认是否清空
        const { confirmDelete } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirmDelete',
          default: false,
          message: '是否确认清空当前目录下的文件？'
        });
        if (confirmDelete) {
          // 清空文件夹
          fse.emptyDirSync(localPath);
        }
      }
    }
    // eslint-disable-next-line consistent-return
    return this.getProjectInfo();
  }

  /**
   * 1. 通过项目模板API获取项目模板信息
   * 1.1 通过 egg.js 搭建一套后端系统
   * 1.2 通过npm存储项目模板
   * 1.3 将项目模板信息存储到mongodb数据库中
   * 1.4 通过egg.js获取mongodb中的数据并且通过API返回
   */
  async downloadTemplate() {
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(item => item.npmName === projectTemplate);
    const targetPath = path.resolve(homedir(), '.pig-cli', 'template');
    const storeDir = path.resolve(homedir(), '.pig-cli', 'template', 'node_modules');
    const { npmName, version } = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version
    });
    if (!await templateNpm.exists()) {
      const spinner = spinnerStart('正在下载模板……');
      sleep();

      try {
        await templateNpm.install();
        log.success('下载模板成功');
      } catch (e) {
        throw new Error(e);
      } finally {
        spinner.stop(true);
      }
    } else {
      const spinner = spinnerStart('正在更新模板……');
      sleep();

      try {
        await templateNpm.update();
        log.success('更新模板成功');
      } catch (e) {
        throw new Error(e);
      } finally {
        spinner.stop(true);
      }
    }
  }

  /**
   * 1.选择创建项目或组件
   * 2.获取项目的基本信息
   * @returns {Object} 项目基本信息
   */
  async getProjectInfo() {
    let projectInfo = {};

    // 选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: '请选择初始化类型',
      default: TYPE_PROJECT,
      choices: [
        {
          name: '项目',
          value: TYPE_PROJECT
        },
        {
          name: '组件',
          value: TYPE_COMPONENT
        }
      ]
    });
    log.verbose('===> type: ', type);

    // 获取项目的基本信息
    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: '请输入项目名称',
          default: '',
          // 1.首字符必须为小写
          // 2.尾字符必须为小写字母或数字
          // 3.字符可用 - 连接
          // 4.- 连接的字符不能直接是数字
          validate(v) {
            const done = this.async();

            setTimeout(() => {
              if (!/^[a-z]+(([-][a-z]+)*)([a-z0-9]?)$/.test(v)) {
                done('请输入合法的项目名称');
                return;
              }
              done(null, true);
            }, 0);
          }
        },
        {
          type: 'input',
          name: 'projectVersion',
          message: '请输入项目版本号',
          default: '1.0.0',
          validate(v) {
            const done = this.async();

            setTimeout(() => {
              if (!semver.valid(v)) {
                done('请输入合法的版本号，如1.0.0');
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: v => (semver.valid(v) ? semver.valid(v) : v)
        },
        {
          type: 'list',
          name: 'projectTemplate',
          message: '请选择项目模板',
          choices: this.createTemplatechoice()
        }
      ]);
      projectInfo = {
        type,
        ...project
      };
    } else if (type === TYPE_COMPONENT) {
      //
    }

    return projectInfo;
  }

  static isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    fileList = fileList.filter(file => (!file.startsWith('.') && !file.includes('node_modules')));
    return !fileList || fileList.length <= 0;
  }

  createTemplatechoice() {
    return this.template.map(item => ({
      value: item.npmName,
      name: item.name
    }));
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
