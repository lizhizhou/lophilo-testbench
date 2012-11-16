'use strict';

var assert = require('should');
var dnodeloader = require('dnode-dynamicloader');
var dnodeError = dnodeloader.err;

describe('audio input/output', function() {
  var pocketsphinxjs;
  var testdata;

  before(function(done) {
    dnodeloader.requireFork('pocketsphinxjs', process.env.LMC_IP, parseInt(process.env.LMC_PORT),
      function(err, remoteObject) {
        if(err) return done(dnodeError(err));
        pocketsphinxjs = remoteObject;
        if(testdata)
          done();
        else
          console.log('not ready yet, missing testdata');
    });
    dnodeloader.requireFork('pocketsphinxjs-testdata', process.env.LMC_IP, parseInt(process.env.LMC_PORT),
      function(err, remoteObject) {
        if(err) return done(dnodeError(err));
        testdata = remoteObject;
        if(pocketsphinxjs)
          done();
        else
          console.log('not ready yet, missing pocketsphinxjs');
    });
  });
  function checkHypothesis(done) {
    pocketsphinxjs.getNextHypothesis(function(err, hypothesis) {
      if(err) return done(dnodeError(err));
      console.log('TEST: hypothesis received');
      hypothesis.should.equal('go forward ten meters');
      pocketsphinxjs.stop(done);
    });
  }

  function playAudio() {
    testdata.play(testdata.GOFORWARD_RAW, function(err, message) {
      if(err) return done(dnodeError(err));
      console.log('TEST: played test audio');
    });
  }

  function startRecognition(done) {
    pocketsphinxjs.start(function(err) {
      console.log('TEST: START CALLBACK');
      console.log(JSON.stringify(err));
      if(err) return done('failed callback');
      console.log('TEST: before completed - ready');
      console.log('TEST: recognize from microphone');
      pocketsphinxjs.recognizeFromMicrophone(function(err) {
        console.log('TEST: callback');
        if(err) throw new Error(dnodeError(err));
        checkHypothesis(done);
        playAudio();
      });
    });
  }

  beforeEach(function() {
    console.log('TEST: >>>>>>>>>>>>>>>>>>>>>>>');
  });

  it('played audio is recognized', function(done) {
    startRecognition(done);
  });

  it('recognition can successfully be restarted', function(done) {
    startRecognition(done);
  });

  afterEach(function() {
    console.log('TEST: <<<<<<<<<<<<<<<<<<<<<<<<');
  });

  after(function(done) {
    dnodeloader.stopFork('pocketsphinxjs', function(err, status) {
      if(err) return done(dnodeError(err));
      console.log(status);
      dnodeloader.stopFork('pocketsphinxjs-testdata', function(err, status) {
        if(err) return done(dnodeError(err));
        console.log(status);
        done();
      });
    });
  });
});

