const { Spinner } = require('cli-spinner');

function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

function spinnerStart(msg = 'loading...', spinnerString = '|/-\\') {
  const spinner = new Spinner(`${msg} %s`);
  spinner.setSpinnerString(spinnerString);
  spinner.start();
  return spinner;
}

function sleep(delay = 1000) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise(resolve => setTimeout(resolve, delay));
}

module.exports = {
  isObject,
  spinnerStart,
  sleep
};
