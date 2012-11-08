'use strict';

var assert = require('should');
var dnodeloader = require('dnode-dynamicloader');
var ntc = require('ntc');

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
    var values = process.env.LMC_MAC.match(/\w+/g);
    var ledIndex = 0;
    var colors = [
      'White', 
      'Green', 
      'Yellow', 
      'Red', 
      'Blue', 
      'Purple', 
      'Orange'
    ];
    var selected = []
    values.slice(2).forEach(function(value) {
      value = parseInt(value, 16);
      var selectedColor = colors[Math.round(value/(0xFF/colors.length))];
      selected.push(selectedColor);
      var rgbValue = ntc.value(selectedColor);
      lophilo.leds['led' + ledIndex].srgb.write(rgbValue);
      ledIndex++;
    });
    console.log(process.env.LMC_MAC + ' = ' + selected);
    done();    
  });

  after(function() {
  });
});

