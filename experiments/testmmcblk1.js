'use strict';

var fs = require('fs');
var sprintf = require('sprintf').sprintf;
var assert = require('should');

function getBlockDeviceSize(name) {
  var sysFileSize = sprintf('/sys/class/block/%s/size', name)
  return parseInt(fs.readFileSync(sysFileSize).toString())*512;
}

function getTestBuffer(size) {
  var testString = '0123456789ABCDEF';
  assert((size%testString.length) === 0, '' + size + ' is not a multiple of ' + testString.length);
  var stringCount = size/testString.length;
  var buffer = new Buffer(testString.length*stringCount);  
  for(var i=0; i<stringCount; i++) {
    buffer.write(testString, i*testString.length, testString.length, 'ascii');
  }  
  return buffer;
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
      self.latestBps = (i - self.lastCount)/(delta[0]);
      self.totalBps += self.latestBps;
      var mbps = Math.round(self.latestBps / (1024*1024));
      var completion = Math.round(((i/self.total)*100));
      console.log('bytes: ' + i + ', completed ' + completion + '%, mbps ' + mbps);

      self.lastCount = i;
      self.lastTime = process.hrtime();
    }
  }
}

function writeTestData(filename, disksize, testBuffer) {
  var stats = new StatsCollector(disksize);
  var written = 0;
  console.log('disk size ' + disksize);
  console.log('buffer length ' + testBuffer.length);

  var fd = fs.openSync(filename, 'w')
  for(var i=0; i<disksize; i+=testBuffer.length) {
    written = 0;
    while(written !== testBuffer.length) {
      written += fs.writeSync(fd, testBuffer, written, testBuffer.length - written, i + written);  
    }

    stats.update(i);
  }
  fs.closeSync(fd);
  var delta = process.hrtime(startTime);
  console.log('write completed in ' + delta);  
}

function checkTestData(filename, disksize, testBuffer) {
  var stats = new StatsCollector(disksize);

  var readBuffer = new Buffer(testBuffer.length);
  var fd = fs.openSync(filename, 'r')
  var read = 0;
  for(var i=0; i<disksize; i+=testBuffer.length) {
    read = 0
    while(read !== testBuffer.length) {
      read += fs.readSync(fd, readBuffer, read, testBuffer.length - read, i + read); 
    }
    assert(readBuffer.toString() === testBuffer.toString(), 'failed check at position ' + (i+read));
    stats.update(i);    
  }  
}


if (require.main === module) {
  var filename = '/dev/mmcblk1';
  var disksize = getBlockDeviceSize('mmcblk1');
  var testBuffer = getTestBuffer(64*1024);
  if(process.argv.indexOf('write') !== -1) {
    writeTestData(filename, disksize, testBuffer);
  }
  if(process.argv.indexOf('check') !== -1) {
    checkTestData(filename, disksize, testBuffer);
  }
} 