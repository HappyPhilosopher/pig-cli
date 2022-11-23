/**
 * 初始化
 * @param {String} projectName
 * @param {Object} options
 */
function init(projectName, options) {
  // 通过环境变量获取传入的 targetPath
  console.log('init', projectName, options, process.env.CLI_TARGET_PATH);
}

module.exports = init;
