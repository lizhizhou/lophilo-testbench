'use strict';

var crypto = require('crypto');
var assert = require('should');
var dnodeloader = require('dnode-dynamicloader');
var dnodeError = dnodeloader.err;
var utils = require('./lib/utils');

describe('dmesg output', function() {
  var lcons;
  var dmesg;

  before(function(done) {
    dnodeloader.require('lophilo-console', process.env.LMC_IP, parseInt(process.env.LMC_PORT),
      function(err, remoteObject) {
        console.log('require');
        if(err) return done(dnodeError(err));
        lcons = remoteObject;
        lcons.cleanup(function(err) {
          lcons.setup(function(err) {
            console.log('setup');
            if(err) return done(dnodeError(err));
            console.log('setup no error');
            utils.cleanSerialGarbage(lcons, function() {
              console.log('clean console');
              lcons.writeReadUntilDelimiter("/bin/dmesg\n", function(err, data) {
                console.log('writeReadUntilDelimiter');
                if(err) return done(dnodeError(err));
                console.log('writeReadUntilDelimiter no error');
                dmesg = '' + data;
                console.log('converted dmesg data to string');
                utils.record('dmesg', dmesg);
                console.log('wrote dmesg record');
                lcons.cleanup();
                done();
              });
            });
          })
        });
    });
  });

  it('audio controller', function(done) {
    if(dmesg.indexOf('atmel_ac97c atmel_ac97c.0: Atmel AC97 controller at') === -1) {
      return done(new Error('new audio string'));
    }
    done();
  });

  it('external test SD card', function(done) {
    if(dmesg.indexOf(' mmcblk1: unknown partition table') === -1) {
      return done(new Error('missing test SD card'));
    }
    done();
  });

  it('lophilo driver', function(done) {
    if(dmesg.indexOf('Lophilo ended detection, found 0xa5a5a5a') === -1) {
      return done(new Error('missing lophilo kernel driver'));
    }
    done();
  });

  it('High speed USB host', function(done) {
    if(dmesg.indexOf('at91_ohci at91_ohci: AT91 OHCI') === -1) {
      return done(new Error('missing usb host controller'));
    }
    done();
  });

  it('ft2232', function(done) {
    //if(dmesg.indexOf('usb 1-2.1: FTDI USB Serial Device converter now attached to ttyUSB1') === -1) {
    if(dmesg.indexOf('FTDI USB Serial Device converter now attached to ttyUSB1') === -1) {
      return done(new Error('missing serial interface'));
    }
    done();
  });

  it('lophilo machine string', function(done) {
    if(dmesg.indexOf('Machine: Lophilo Tabby') === -1) {
      return done(new Error('missing version identifier'));
    }
    done();
  });

  it('kernel is version 3.4.18', function(done) {
    if(dmesg.indexOf('Linux version 3.4.18+') === -1) {
      return done(new Error('missing version identifier'));
    }
    done();
  });
});