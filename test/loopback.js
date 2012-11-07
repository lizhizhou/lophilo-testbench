'use strict';

var assert = require('should');
var dnodeloader = require('dnode-dynamicloader');
var Q = require('q');

describe('lophilo pwm0 -> gpio0', function() {
  var lophilo;

  before(function(done) {
    dnodeloader.require('lophilo', process.env.LMC_IP, parseInt(process.env.LMC_PORT), 
      function(err, remoteObject) {
        if(err) return done(err);
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
    //lophilo.dnode.end();
  });
});

