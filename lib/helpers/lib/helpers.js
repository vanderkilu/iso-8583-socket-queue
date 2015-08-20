var ISOLIB      = require('../../../lib/iso8583-smartvista');
var ISO         = ISOLIB.ISO8583;
var packager    = ISOLIB.defaultPackager;
var path        = require('path');
var fs          = require('fs');

//module.exports = helpers;
module.exports.safeLog = function(msg, modes) {
  // In dangerous mode -- do nothing
  if (global.c.dangerous) return msg;

  if (!modes) modes = ['pan'];

  if (msg instanceof Buffer) msg = msg.toString();
  else if (typeof msg == 'number') msg = msg.toString();

  // Whole Message
  if (modes.indexOf('isoMessage') >= 0) {
    // Replace non-printable
    var regexp = /[^a-z0-9=]/gm;
    msg = msg.replace(regexp, '.');
  }

  // Card Pan
  if (modes.indexOf('pan') >= 0) {
    if (typeof msg == 'string') {
      var regexp = /(.*)(\d{6})(\d{4})\=(\d{4})(.*)/gm;
      var panPart = '';
      msg = msg.replace(regexp, function (complete, a, b, c, d, f) {
        panPart = b;
        return a + new Array(b.length + 1).join("*") + c + '=' + d + f;
      });

      // Need to swipe away the detected part of pan from entire message
      if (panPart) {
        var regexp = /(\.\.)(\d{16,18})/gm;
        msg = msg.replace(regexp, function (complete, a,b) {
          return a + new Array(b.length + 1).join("*");
        });
      }
    } else if (typeof msg == 'object') {
      for (var k in msg) {
        if (msg.hasOwnProperty(k)) msg[k] = this.safeLog(msg[k]);
      }
    }
  }

  // Card Number
  if (modes.indexOf('number') >= 0) {
    var regexp = /(\d{6})(\d{6})(\d{4})/gm;
    msg = msg.replace(regexp, function (complete, a, b, c) {
      return a + new Array(b.length + 1).join("*") + c;
    });
  }

  // Field 55
  if (modes.indexOf('field55') >= 0) {

  }

  return msg;
};

// Split multiple messages separated with header
module.exports.splitByHeader = function(message) {
  var result = [];
  var index = 0;

  while (1) {
    var cnt = message.slice(index, index + 4);

    var length = parseInt(cnt.toString());
    if (!length) break;

    index += 4;
    result.push(message.slice(index, index + length));
    index += length;
    if (index >= message.length) break;
  }

  return result;
}

// Random string generator
module.exports.randomString = function(length, mode) {
  var charsNumbers = '0123456789';
  var charsLower   = 'abcdefghijklmnopqrstuvwxyz';
  var charsUpper   = charsLower.toUpperCase();

  var chars = '';
  if (!mode || mode == 1) chars += charsNumbers;
  if (!mode || mode == 2) chars += charsLower + charsUpper;
  if (!length) length = 32;

  var string = '';

  for (var i = 0; i < length; i++) {
    var randomNumber = Math.floor(Math.random() * chars.length);
    string += chars.substring(randomNumber, randomNumber + 1);
  }

  return string;
}

// Rotate winston logs
module.exports.winstonRotate = function(fileTransport) {
  var fullname = path.join(fileTransport.dirname, fileTransport._getFile(false));

  function reopen() {
    if (fileTransport._stream) {
      fileTransport._stream.end();
      fileTransport._stream.destroySoon();
    }

    var stream = fs.createWriteStream(fullname, fileTransport.options);
    stream.setMaxListeners(Infinity);

    fileTransport._size = 0;
    fileTransport._stream = stream;

    fileTransport.once('flush', function () {
      fileTransport.opening = false;
      fileTransport.emit('open', fullname);
    });

    fileTransport.flush();
  }

  //fs.stat(fullname, function (err) {
  //    if (err && err.code == 'ENOENT') {
  return reopen();
  //    }
  //});
}