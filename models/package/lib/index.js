const path = require('path');
const pkgDir = require('pkg-dir').sync;
const pathExists = require('path-exists');
const npminstall = require('npminstall');
const { isObject } = require('@pig-cli/utils');
const formatPath = require('@pig-cli/format-path');
const { getDefaultRegistry, getNpmLatestVersion } = require('@pig-cli/get-npm-info');

class Package {
  constructor(options) {
    if (!options) {
      throw new Error('Package类的options参数不能为空');
    }
    if (!isObject(options)) {
      throw new Error('Package类的options参数必须为对象');
    }

    // package的目标路径
    this.targetPath = options.targetPath;
    // package的缓存路径
    this.storeDir = options.storeDir;
    // package的name
    this.packageName = options.packageName;
    // package的version
    this.packageVersion = options.packageVersion;
    // package的缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace('/', '_');
  }

  async prepare() {
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  get cacheFilePath() {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`);
  }

  /**
   * 判断当前Package是否存在
   */
  async exists() {
    if (this.storeDir) {
      await this.prepare();
      return pathExists(this.cacheFilePath);
    }
    return pathExists.sync(this.targetPath);
  }

  /**
   * 安装Package
   */
  async install() {
    await this.prepare();
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [
        {
          name: this.packageName,
          version: this.packageVersion
        }
      ]
    });
  }

  // /**
  //  * 更新Package
  //  */
  // update() {}

  /**
   * 获取入口文件的路径
   */
  getRootFilePath() {
    const dir = pkgDir(this.targetPath);
    if (dir) {
      const pkgFile = require(path.join(dir, 'package.json'));
      if (pkgFile && pkgFile.main) {
        return formatPath(path.resolve(dir, pkgFile.main));
      }
    }
    return null;
  }
}

module.exports = Package;