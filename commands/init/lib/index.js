const Command = require('@pig-cli/command');
const log = require('@pig-cli/log');

class InitCommand extends Command {
  init() {
    this.projectName = this.argv[0] || '';
    // this.force = this.argv;
    log.verbose('===> projectName: ', this.projectName);
    // log.verbose('===> force: ', this.force);
  }

  exec() {
    console.log('init的业务逻辑');
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
