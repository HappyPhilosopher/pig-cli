const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const inquirer = require('inquirer');
const fse = require('fs-extra');
const semver = require('semver');
const ejs = require('ejs');
const glob = require('glob');
const Command = require('@pig-cli/command');
const log = require('@pig-cli/log');
const Package = require('@pig-cli/package');
const { spinnerStart, sleep, execAsync } = require('@pig-cli/utils');
const getProjectTemplate = require('./get-project-template');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';
const WHITE_COMMAND = ['npm', 'cnpm'];

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
        await this.installTemplate();
      }
    } catch (err) {
      log.error(err.message);
    }
  }

  /**
   * 安装模板
   */
  async installTemplate() {
    if (this.templateInfo) {
      log.verbose('===> template type: ', this.templateInfo.type);
      if (!this.templateInfo.type || this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate();
      } else {
        throw new Error('无法识别项目模板');
      }
    } else {
      throw new Error('项目模板信息不存在');
    }
  }

  static async execCommand(command, errMsg) {
    let installRet;
    if (command) {
      const cmdArray = command.split(' ');
      const cmd = InitCommand.checkCommand(cmdArray[0]);
      if (!cmd) {
        throw new Error('命令不存在');
      }
      const args = cmdArray.slice(1);
      installRet = await execAsync(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    }
    if (installRet !== 0) {
      throw new Error(errMsg);
    }
    return installRet;
  }

  /**
   * 通过ejs渲染模板
   * @param {Object} options
   * @returns
   */
  ejsRender(options) {
    const dir = process.cwd();
    const projectInfo = {
      ...this.projectInfo,
      version: this.projectInfo.projectVersion
    };
    log.verbose('===> render projectInfo: ', projectInfo);

    return new Promise((resolve, reject) => {
      glob('**', {
        cwd: dir,
        ignore: options.ignore || '',
        nodir: true
      }, (err, files) => {
        if (err) {
          reject(err);
        }
        Promise.all(files.map(file => {
          const filePath = path.join(dir, file);
          return new Promise((res, rej) => {
            ejs.renderFile(filePath, projectInfo, {}, (e, result) => {
              if (e) {
                rej(e);
              } else {
                fse.writeFileSync(filePath, result);
                res(result);
              }
            });
          });
        })).then(() => {
          resolve();
        }).catch(error => {
          reject(error);
        });
      });
    });
  }

  /**
   * 安装通用模板
   */
  async installNormalTemplate() {
    // 拷贝模板代码至当前目录
    const spinner = spinnerStart('正在安装模板……');
    await sleep();
    try {
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
      const targetPath = process.cwd();
      // 确保目录存在（不存在则生成）
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      // 拷贝代码
      fse.copySync(templatePath, targetPath);
    } catch (e) {
      throw new Error(e);
    } finally {
      spinner.stop(true);
      log.success('安装模板成功');
    }

    const templateIgnore = this.templateInfo.ignore || [];
    const ignore = ['**/node_modules/**', ...templateIgnore];
    await this.ejsRender({ ignore });

    const { installCommand, startCommand } = this.templateInfo;
    // 安装依赖
    await InitCommand.execCommand(installCommand, '依赖安装失败');
    // 启动命令执行
    await InitCommand.execCommand(startCommand, '项目启动失败');
  }

  /**
   * 判断命令是否为白名单，防止注入非法命令
   * @param {String} cmd
   * @returns
   */
  static checkCommand(cmd) {
    return WHITE_COMMAND.includes(cmd) ? cmd : null;
  }

  /**
   * 安装自定义模板
   */
  async installCustomTemplate() {
    // 查询自定义模板的入口文件
    if (await this.templateNpm.exists()) {
      const rootFile = this.templateNpm.getRootFilePath();
      if (fs.existsSync(rootFile)) {
        log.notice('开始执行自定义模板');
        const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
        const options = {
          templateInfo: this.templateInfo,
          projectInfo: this.projectInfo,
          sourcePath: templatePath,
          targetPath: process.cwd()
        };
        const code = `require('${rootFile}')(${JSON.stringify(options)})`;
        log.verbose('===> code: ', code);
        await execAsync('node', ['-e', code], {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        log.success('自定义模板安装成功');
      }
    } else {
      throw new Error('自定义模板入口文件不存在');
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
    this.templateInfo = templateInfo;
    const targetPath = path.resolve(homedir(), '.pig-cli', 'template');
    const storeDir = path.resolve(homedir(), '.pig-cli', 'template', 'node_modules');
    const { npmName, version } = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version
    });
    log.verbose('===> templateNpm', templateNpm);
    if (!await templateNpm.exists()) {
      const spinner = spinnerStart('正在下载模板……');
      sleep();

      try {
        await templateNpm.install();
      } catch (e) {
        throw new Error(e);
      } finally {
        spinner.stop(true);
        if (templateNpm.exists()) {
          log.success('下载模板成功');
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = spinnerStart('正在更新模板……');
      sleep();

      try {
        await templateNpm.update();
      } catch (e) {
        throw new Error(e);
      } finally {
        spinner.stop(true);
        if (templateNpm.exists()) {
          log.success('更新模板成功');
          this.templateNpm = templateNpm;
        }
      }
    }
  }

  /**
   * 1.选择创建项目或组件
   * 2.获取项目的基本信息
   * @returns {Object} 项目基本信息
   */
  async getProjectInfo() {
    function isValidName(v) {
      return /^[a-z]+(([-][a-z]+)*)([a-z0-9]?)$/.test(v);
    }

    let projectInfo = {};
    let isProjectNameValid = false;
    if (isValidName(this.projectName)) {
      isProjectNameValid = true;
      projectInfo.projectName = this.projectName;
    }

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
    this.template = this.template.filter(template => template.tag.includes(type));
    const title = type === TYPE_PROJECT ? '项目' : '组件';

    const projectPrompt = [];
    const projectNamePrompt = {
      type: 'input',
      name: 'projectName',
      message: `请输入${title}名称`,
      default: '',
      // 1.首字符必须为小写
      // 2.尾字符必须为小写字母或数字
      // 3.字符可用 - 连接
      // 4.- 连接的字符不能直接是数字
      validate(v) {
        const done = this.async();

        setTimeout(() => {
          if (!isValidName(v)) {
            done('请输入合法的项目名称');
            return;
          }
          done(null, true);
        }, 0);
      }
    };
    if (!isProjectNameValid) {
      projectPrompt.push(projectNamePrompt);
    }
    projectPrompt.push(
      {
        type: 'input',
        name: 'projectVersion',
        message: `请输入${title}版本号`,
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
        message: `请选择${title}模板`,
        choices: this.createTemplatechoice()
      }
    );

    // 获取项目的基本信息
    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...project
      };
    } else if (type === TYPE_COMPONENT) {
      // 获取组件的基本信息
      const descriptionPrompt = {
        type: 'input',
        name: 'componentDescription',
        message: '请输入组件描述信息',
        default: '',
        validate(v) {
          const done = this.async();

          setTimeout(() => {
            if (!v) {
              done('请输入组件描述信息');
              return;
            }
            done(null, true);
          }, 0);
        }
      };
      projectPrompt.push(descriptionPrompt);
      const component = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...component
      };
    }

    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription;
    }

    return projectInfo;
  }

  /**
   * 判断传入地址是否为空
   * @param {String} localPath
   * @returns {Boolean}
   */
  static isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    fileList = fileList.filter(file => (!file.startsWith('.') && !file.includes('node_modules')));
    return !fileList || fileList.length <= 0;
  }

  /**
   * 创建选项
   * @returns
   */
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
