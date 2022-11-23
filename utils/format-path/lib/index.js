const path = require('path');

/**
 * 对不同操作系统路径的兼容
 * MacOS为 / ，Windows为 \
 * @param {String} p 路径
 * @returns
 */
function formatPath(p) {
  if (p && typeof p === 'string') {
    const { sep } = path;
    if (sep === '/') {
      return p;
    }
    return p.replace(/\\/g, '/');
  }
  return p;
}

module.exports = formatPath;
