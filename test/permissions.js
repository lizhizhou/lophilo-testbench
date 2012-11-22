'use strict';

var crypto = require('crypto');
var assert = require('should');
var dnodeloader = require('dnode-dynamicloader');
var dnodeError = dnodeloader.err;

describe('executable permissions', function() {
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
    // get rid of any garbage that could be left on the command-line
    lcons.writeReadUntilDelimiter('\n', function(err, data) {
      if(err) return done(dnodeError(err));
      lcons.writeReadUntilDelimiter('\n', function(err, data) {
        if(err) return done(dnodeError(err));
        done();
      });
    });
  });

  it('/usr/bin/sudo permissions are correct', function(done) {
    lcons.writeReadUntilDelimiter("ls -al /usr/bin/sudo\n", function(err, data) {
      if(err) return done(dnodeError(err));
      if(data.indexOf('-rwsr-sr-x 1 root root') === -1) {
        return done(new Error('got ' + data));
      }
      done();
    });
  });

  after(function() {
    //lophilo.dnode.end();
    lcons.cleanup();
  });
});

