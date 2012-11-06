'use strict';

var dnode = require('dnode');
var Q = require('q');
var assert = require('should');

describe('lophilo', function() {
  var d;
  var lophilo;

  before(function(done) {
    d = dnode.connect(process.env.LOPHILO_IP, process.env.LOPHILO_PORT);
    d.on('remote', function(remoteObject) {
      lophilo = remoteObject;
      done();
    });
  });

  it('simple I/O works', function(done) {
    lophilo.readq = Q.nbind(lophilo.read, lophilo);
    lophilo.writeq = Q.nbind(lophilo.write, lophilo);
    lophilo.gpio0.doe.write(lophilo.GPIO_ALL_ON);
    lophilo.writeq('gpio0.io0', 0)
      .then(function(result) {
        result.should.be.equal('lophilo: value 0 written to gpio0.io0');
        return lophilo.readq('gpio0.io0');
      })
      .then(function(result) {
        result.should.be.equal(0);
        return lophilo.writeq('gpio0.io0', 1);
      })
      .then(function(result) {
        result.should.be.equal('lophilo: value 1 written to gpio0.io0');
        return lophilo.readq('gpio0.io0');
      })
      .then(function(result) {
          result.should.be.equal(1);
          done();
      })
      .fail(function(err) {
        done(err);
      });

  });

  after(function() {
    lophilo.gpio0.doe.write(lophilo.GPIO_ALL_OFF);
    d.end();
  });
});

