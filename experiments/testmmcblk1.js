'use strict';

var fs = require('fs');
var assert = require('should');

var disksize = parseInt(fs.readFileSync('/sys/class/block/mmcblk1/size').toString())*512;
var blocksize = 4096;
var testString = '0123456789ABCDEF';
var stringCount = 4096;
var buffer = new Buffer(testString.length*stringCount);

for(var i=0; i<stringCount; i++) {
  buffer.write(testString, i*testString.length, testString.length, 'ascii');
}

function StatsCollector(total) {
  var self = this;
  self.startTime = process.hrtime();
  self.lastTime = self.startTime;
  self.lastCount = 0;  
  self.total = total;
  self.totalBps = 0;
  self.count = 0;
  self.update = function(i) {
    var delta = process.hrtime(self.lastTime);
    if(delta[0] > 5) {
      self.count++;
      var bps = (i - self.lastCount)/(delta[0]);
      self.totalBps += bps;
      var mbps = Math.round(bps / (1024*1024));
      var completion = Math.round(((i/self.total)*100));
      console.log('bytes: ' + i + ', completed ' + completion + '%, mbps ' + mbps);

      self.lastCount = i;
      self.lastTime = process.hrtime();
    }
  }
}
function writeTestData(filename) {
  var stats = new StatsCollector(disksize);
  var written = 0;
  console.log('disk size ' + disksize);
  console.log('buffer length ' + buffer.length);

  var fd = fs.openSync(filename, 'w')
  for(var i=0; i<disksize; i+=buffer.length) {
    written = 0;
    while(written !== buffer.length) {
      written += fs.writeSync(fd, buffer, written, buffer.length - written, i + written);  
    }

    stats.update(i);
  }
  fs.closeSync(fd);
  var delta = process.hrtime(startTime);
  console.log('write completed in ' + delta);  
}

function checkTestData(filename) {
  var stats = new StatsCollector(disksize);

  var readBuffer = new Buffer(buffer.length);
  var fd = fs.openSync(filename, 'r')
  var read = 0;
  for(var i=0; i<disksize; i+=buffer.length) {
    read = 0
    while(read !== buffer.length) {
      read += fs.readSync(fd, readBuffer, read, buffer.length - read, i + read); 
    }
    assert(readBuffer.toString() === buffer.toString(), 'failed check at position ' + (i+read));
    stats.update(i);    
  }  
}


if (require.main === module) {
  if(process.argv.indexOf('write') !== -1) {
    writeTestData();
  }
  if(process.argv.indexOf('check') !== -1) {
    checkTestData('/dev/mmcblk1');
  }
} 