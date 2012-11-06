'use strict';

var dnode = require('dnode');
var Q = require('q');
var assert = require('should');

describe('lophilo', function() {
  var d;
  var lophilo;

  before(function(done) {
    d = dnode.connect(process.env.LOPHILO_IP, process.env.LOPHILO_PORT);
    d.on('error', function(err) {
      console.error(err.stack);
    });
    d.on('remote', function(remoteObject) {
      lophilo = remoteObject;
      lophilo.readq = Q.nbind(lophilo.read, lophilo);
      lophilo.writeq = Q.nbind(lophilo.write, lophilo);
      lophilo.powerOnShields();
      done();
    });

  });

  it('pwm -> gpio works', function(done) {
    lophilo.gpio0.doe.write(lophilo.GPIO_ALL_OFF);
    var gate = Math.round(1/(1/lophilo.MASTER_CLOCK_HZ));
    var ids = []
    for(var i=2;i<26;i++) {
      ids.push(i);
    }
    var setupPromises = [];
    ids.forEach(
      function(id) {
        setupPromises.push(
          Q.fcall(function() {
            var pwm = lophilo.pwm0['pwm' + id];
            pwm.gate.write(gate);
            pwm.dtyc.write(gate);
            pwm.outinv.write(0x0);
            pwm.pmen.write(0x0);
            pwm.fmen.write(0x0);
            pwm.reset.write(0x0);
          })
        );
      }
    );
    Q.allResolved(setupPromises)
        .fail(function(err) {
          console.log(err.stack);
          done(err);
        });

    var readPromises = [];
    ids.forEach(function(id) {
      readPromises.push(lophilo.readq('lophilo.gpio0.io' + id)
        .then(
        function(result) {
          result.should.be.equal(0, 'for id ' + id);
        })
        .fail(function(err) {
          done(err);
        }));
    });
    Q.all(readPromises)
        .fail(function(err) {
          console.log(err.stack);
          done(err);
        });
    var pwmPromises = [];
    ids.forEach(function(id) {
      pwmPromises.push(Q.fcall(function() {
        var pwm = lophilo.pwm0['pwm' + id];
        assert(pwm, 'should return a valid pwm for id ' + id);
        pwm.gate.write(gate);
        pwm.dtyc.write(gate);
        pwm.outinv.write(0x1);
        pwm.reset.write(0x0);
      }))
    });

    Q.all(pwmPromises)
      .fail(function(err) {
          console.log(err.stack);
          done(err);
        });

    var readPromises2 = [];
    ids.forEach(
      function(id) {
        readPromises2.push(
          lophilo.readq('lophilo.gpio0.io' + id).then(
            function(result) {
              result.should.be.equal(1, 'for id ' + id);
            })
        )
      }
    );

    Q.all(readPromises2)
      .then(function() {
        done();
      })
      .fail(function(err) {
        done(err);
      });
  });

  after(function() {
    lophilo.powerOffShields();
    d.end();
  });
});

