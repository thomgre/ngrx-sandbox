/*jslint node:true */

'use strict';

/**
 * migrations are written using a simple module that accepts
 * the dynamodb and a callback to communicate the end of the process.
 *
 * @param dynamodb {object} the dynamodb connection
 * @param callback {function} the callback
 */

exports.migrate = function(dynamodb, callback) {
  callback();
}
