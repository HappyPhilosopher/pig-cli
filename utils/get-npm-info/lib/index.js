const axios = require('axios');
const semver = require('semver');

/**
 * 获取默认npm源
 * @param {Boolean} isOriginal 是否使用npm源（否则使用淘宝源）
 * @returns
 */
function getDefaultRegistry(isOriginal = true) {
  return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org';
}

/**
 * 获取npm包信息
 * @param {String} npmName
 * @param {Boolean} registry npm源
 * @returns
 */
function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null;
  }
  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = `${registryUrl}/${npmName}`;

  return axios.get(npmInfoUrl).then(res => {
    if (res.status !== 200) {
      return null;
    }
    return res.data;
  });
}

/**
 * 获取npm版本集合
 * @param {String} npmName
 * @param {Boolean} registry npm源
 * @returns
 */
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  if (data) {
    return Object.keys(data.versions);
  }
  return [];
}

/**
 * 获取大于等于基准版本的版本集合，并按从大到小排序
 * @param {String} baseVersion 基准版本，该项目为当前版本
 * @param {String[]} versions
 * @returns
 */
function getSemverVersions(baseVersion, versions) {
  return versions.filter(version => semver.satisfies(version, `^${baseVersion}`)).sort((a, b) => semver.gt(b, a));
}

/**
 * 获取最新版本
 * @param {String} npmName
 * @param {Boolean} registry npm源
 * @returns
 */
async function getNpmLatestVersion(npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  if (versions) {
    return versions.sort((a, b) => semver.gt(b, a))[0];
  }
  return null;
}

/**
 * 获取最新版本
 * @param {String} baseVersion 基准版本，该项目为当前版本
 * @param {String} npmName
 * @param {Boolean} registry npm源
 * @returns
 */
async function getNpmSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  const newVersions = getSemverVersions(baseVersion, versions);
  if (newVersions && newVersions.length > 0) {
    return newVersions[0];
  }
  return null;
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion,
  getNpmLatestVersion,
  getDefaultRegistry
};
