const path = require('path');
const pkgDir = require('pkg-dir').sync;
const pathExists = require('path-exists');
const fse = require('fs-extra');
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
    if (this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir);
    }
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  get cacheFilePath() {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`);
  }

  /**
   * 获取指定的缓存路径
   * @param {String} packageVersion
   * @returns
   */
  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`);
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

  /**
   * 更新Package
   */
  async update() {
    await this.prepare();
    // 1.获取最新的npm模块版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    // 2.查询最新版本号对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    // 3.如果不存在，则直接安装最新版本
    if (!pathExists(latestFilePath)) {
      npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [
          {
            name: this.packageName,
            version: latestPackageVersion
          }
        ]
      });
    }
    this.packageVersion = latestPackageVersion;
  }

  /**
   * 获取入口文件的路径
   */
  getRootFilePath() {
    function getRootFile(targetPath) {
      const dir = pkgDir(targetPath);
      if (dir) {
        const pkgFile = require(path.join(dir, 'package.json'));
        if (pkgFile && pkgFile.main) {
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }

    if (this.storeDir) {
      return getRootFile(this.cacheFilePath);
    }
    return getRootFile(this.targetPath);
  }
}

module.exports = Package;
