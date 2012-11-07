'use strict';

var Q = require('q');
var assert = require('should');
var dnodeloader = require('dnode-dynamicloader');

describe('iotestbench', function() {
  var iotestbench;

  before(function(done) {
    dnodeloader.require('iotestbench', process.env.LMC_IP, parseInt(process.env.LMC_PORT), 
      function(err, remoteObject) {
        if(err) return done(err);
        iotestbench = remoteObject;
        done();
    });
  });

  it('no errors reading/writing sdcard', function(done) {
    var maxTime = 15;
    var blockTime = 5;
    this.timeout((maxTime*2+blockTime)*1000);
    iotestbench.executeTestAsync('/dev/mmcblk1', maxTime, blockTime, function(err, result) {
      assert(!err, 'error received ' + err);
      assert(result.test.readErrors.length === 0, 'bad ' + result);
      done();
    });
  });

  after(function() {
    //iotestbench.dnode.end();
  });
});