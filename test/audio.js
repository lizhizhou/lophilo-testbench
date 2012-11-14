'use strict';

var assert = require('should');
var dnodeloader = require('dnode-dynamicloader');

describe('audio input/output', function() {
  var pocketsphinxjs;
  var testdata;

  before(function(done) {
    this.timeout(10000);
    dnodeloader.requireFork('pocketsphinxjs', process.env.LMC_IP, parseInt(process.env.LMC_PORT),
      function(err, remoteObject) {
        if(err) return done(err);
        pocketsphinxjs = remoteObject;
        if(testdata)
          done();
        else
          console.log('not ready yet, missing testdata');
    });
    dnodeloader.requireFork('pocketsphinxjs-testdata', process.env.LMC_IP, parseInt(process.env.LMC_PORT),
      function(err, remoteObject) {
        if(err) return done(dnodeloader.err(err));
        testdata = remoteObject;
        if(pocketsphinxjs)
          done();
        else
          console.log('not ready yet, missing pocketsphinxjs');
    });
  });

  it('played audio is recognized', function(done) {
    this.timeout(60000);
    pocketsphinxjs.startOnReady(function(err, message) {
      if(err) return done(err);
      console.log('ready');
      pocketsphinxjs.getNextHypothesis(function(err, hypothesis) {
        if(err) return done(err);
        console.log('hypothesis received');
        pocketsphinxjs.stop();
        hypothesis.should.equal('go forward ten meters');
        done();
      });
      testdata.play(testdata.GOFORWARD_RAW, function(err, message) {
        if(err) return done(err);
        console.log('played test audio');
      });
    });
  });


  after(function() {
  });
});

