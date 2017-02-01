'use strict';

var fs = require('fs');
var util = require('util');
var chalk = require('chalk');

var MAX_LENGTH = 100;
var PATTERN = /^(?:fixup!\s*)?(\w*)(\(([\w\$\.\*/-]*)\))?\: (.*)$/;
var IGNORED = /^WIP\:/;
var TYPES = {
  feat: true,
  fix: true,
  docs: true,
  style: true,
  refactor: true,
  perf: true,
  test: true,
  chore: true,
  revert: true
};

var error = function() {
  console.error(chalk.red('INVALID COMMIT MSG: ' + util.format.apply(null, arguments)));
};

var validateMessage = function(message) {
  var isValid = true;

  if (IGNORED.test(message)) {
    console.log('Commit message validation ignored.');
    return true;
  }

  if (message.length > MAX_LENGTH) {
    error('is longer than %d characters !', MAX_LENGTH);
    isValid = false;
  }

  var match = PATTERN.exec(message);

  if (!match) {
    error('does not match "<type>(<scope>): <subject>" ! was: ' + message);
    return false;
  }

  var type = match[1];
  var scope = match[3];
  var subject = match[4];

  if (!TYPES.hasOwnProperty(type)) {
    error('"%s" is not allowed type !', type);
    return false;
  }

  // Some more ideas, do we want anything like this ?
  // - allow only specific scopes (eg. fix(docs) should not be allowed ?
  // - auto correct the type to lower case ?
  // - auto correct first letter of the subject to lower case ?
  // - auto add empty line after subject ?
  // - auto remove empty () ?
  // - auto correct typos in type ?
  // - store incorrect messages, so that we can learn

  return isValid;
};

var firstLineFromBuffer = function(buffer) {
  return buffer.toString().split('\n').shift();
};

// publish for testing
exports.validateMessage = validateMessage;

var commitMsgFile = process.argv[2];
var incorrectLogFile = commitMsgFile.replace('COMMIT_EDITMSG', 'logs/incorrect-commit-msgs');

fs.readFile(
  commitMsgFile, function(err, buffer) {
    var msg = firstLineFromBuffer(buffer);

    if (!validateMessage(msg)) {
      fs.appendFile(
        incorrectLogFile, msg + '\n', function() {
          process.exit(1);
        }
      );
    } else {

      console.log(chalk.green(`
        Commit OK.
      `));

      process.exit(0);
    }
  }
);
