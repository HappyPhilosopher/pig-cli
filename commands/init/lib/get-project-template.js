const request = require('@pig-cli/request');

// eslint-disable-next-line func-names
module.exports = function () {
  return request({
    url: '/project/template'
  });
};
