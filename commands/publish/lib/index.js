const Command = require('@pig-cli/command');

class PublishCommand extends Command {
  // init() {
  //   console.log('init publish');
  // }
}

// function init(argv) {
//   return new PublishCommand(argv);
// }

// module.exports = init;
module.exports.PublishCommand = PublishCommand;
