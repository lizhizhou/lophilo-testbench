'use strict';

var crypto = require('crypto');
var assert = require('should');
var dnodeloader = require('dnode-dynamicloader');
var dnodeError = dnodeloader.err;
var utils = require('./lib/utils');

describe('usb host/client ft2232', function() {
  var lcons;

  before(function(done) {
    this.timeout(8000);
    dnodeloader.require('lophilo-console', process.env.LMC_IP, parseInt(process.env.LMC_PORT),
      function(err, remoteObject) {
        if(err) return done(err);
        lcons = remoteObject;
        lcons.cleanup();
        lcons.setup(function(err) {
          if(err) return done(dnodeError(err));
          done();
        })
    });
  });

  beforeEach(function(done) {
    utils.cleanSerialGarbage(lcons, done);
  });

  it('/etc/debian_version is correct', function(done) {
    lcons.writeReadUntilDelimiter("cat /etc/debian_version\n", function(err, data) {
      if(err) return done(dnodeError(err));
      if(data.indexOf('wheezy/sid') === -1) {
        return done(new Error('got ' + data));
      }
      done();
    });
  });

  /*
  it('catting binary file work', function(done) {
    lcons.writeReadUntilDelimiter("md5sum /etc/debian_version\n", function(err, data) {
      console.log(data);
      if(err) return done(dnodeError(err));
      var expectedMD5 = data.match(/\w+/)[0];
      lcons.writeReadUntilDelimiter("cat /etc/debian_version\n", function(err, data) {
        var md5summer = crypto.createHash('md5');
        console.log(data);
        md5summer.update();
        var actualMD5 = md5summer.digest('hex');
        if(actualMD5 !== expectedMD5) {
          done(new Error(actualMD5 + ' does not match ' + expectedMD5));
        } else {
          done();
        }

      });
    });
  });
  */

  after(function() {
    //lophilo.dnode.end();
    lcons.cleanup();
  });
});

