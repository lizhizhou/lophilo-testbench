'use strict';

var assert = require('should');
var dnodeloader = require('dnode-dynamicloader');
var ntc = require('ntc');
var utils = require('./lib/utils');

describe('onboard leds', function() {
  var lophilo;

  before(function(done) {
    dnodeloader.require('lophilo', process.env.LMC_IP, parseInt(process.env.LMC_PORT),
      function(err, remoteObject) {
        if(err) return done(dnodeloader.err(err));
        lophilo = remoteObject;
        done();
    });
  });

  it('MAC to colors', function(done) {
    assert(process.env.LMC_MAC, 'LMC_MAC environment variable must be set');
    var values = process.env.LMC_MAC.match(/\w/g);
    var ledIndex = 0;
    var colors = [
      'White',
      'Green',
      'Yellow',
      'Red',
      'Blue',
      'Purple',
      'Orange',
      'Pink',
      'Aquamarine',
      'Maroon',
    ];
    var selected = []
    values.slice(8).forEach(function(value) {
      value = parseInt(value, 16);
      var idx = Math.floor(value%colors.length)
      var selectedColor = colors[idx];
      selected.push(selectedColor);
      var rgbValue = ntc.value(selectedColor);
      lophilo.leds['led' + ledIndex].srgb.write(rgbValue);
      ledIndex++;
    });
    console.log(process.env.LMC_MAC + ' = ' + JSON.stringify(selected));
    utils.record('colors', JSON.stringify(selected));
    done();
  });

  after(function() {
  });
});

