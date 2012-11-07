'use strict';

var assert = require('should');
var fs = require('fs');
var os = require('os');
var path = require('path');
var sprintf = require('sprintf').sprintf;

function getBlockDeviceSize(filename) {
  var name = path.basename(filename);
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

function StatsCollector(total, countInit, updateFrequency) {
  var self = this;
  self.startTime = process.hrtime();
  self.lastTimeUpdate = self.startTime;
  self.lastTimeDisplay = self.startTime;
  self.lastCount = countInit;  
  self.updateFrequency = updateFrequency ? updateFrequency: 2;
  self.total = total;
  self.totalBps = 0;
  self.count = 0;
  self.update = function(i) {
    var deltaUpdate = process.hrtime(self.lastTimeUpdate);
    self.count++;
    self.latestBps = (i - self.lastCount)/(deltaUpdate[0]+(deltaUpdate[1]/1e9));
    self.totalBps += self.latestBps;    
    self.lastCount = i;
    self.lastTimeUpdate = process.hrtime();

    var deltaDisplay = process.hrtime(self.lastTimeDisplay);
    if((deltaDisplay[0]+1) > self.updateFrequency) {
      self.lastTimeDisplay = process.hrtime();
      var mbps = (self.latestBps / (1024*1024)).toPrecision(2);
      var completion =(((i/self.total)*100)).toPrecision(2);
      console.log('bytes: ' + i + ', completed ' + completion + '%, mbps ' + mbps);
    }
  }
  self.getAverageBps = function() {
    return (self.totalBps / self.count);
  }
  self.getElapsedSeconds = function() {
    var delta = process.hrtime(self.startTime);
    // always round up
    return delta[0]+1;
  }
  self.bench = function() {
    self.bench = process.hrtime();
  }
  self.mark = function(str) {
    console.log(str + ': ' + process.hrtime(self.bench));
  }
}

function writeTestData(filename, diskSize, testBuffer, startOffset, maxElapsedSeconds) {
  startOffset = startOffset ? startOffset : 0;
  var stats = new StatsCollector(diskSize, startOffset, Math.ceil(maxElapsedSeconds/2));
  var written = 0;

  console.log('write startOffset ' + startOffset);

  var fd = fs.openSync(filename, 'rs+')
  var loop = true;
  for(var i=startOffset; i<diskSize && loop; i+=testBuffer.length) {
    written = 0;
    while(written !== testBuffer.length) {
      written += fs.writeSync(fd, testBuffer, written, testBuffer.length - written, i + written);  
    }

    stats.update(i+testBuffer.length);
    if(maxElapsedSeconds && stats.getElapsedSeconds() >= maxElapsedSeconds) {
      loop = false;
    }
  }
  console.log('write completed in ' + stats.getElapsedSeconds());  
  stats.bench()  
  fs.closeSync(fd);
  stats.mark('fs.closeSync');

  return {
    stats: stats,
    start: startOffset,
    end: i
  };
}

function checkTestData(filename, diskSize, testBuffer, startOffset, endOffset) {
  startOffset = startOffset ? startOffset : 0;

  var stats = new StatsCollector(diskSize, startOffset, 1);

  console.log('read startOffset ' + startOffset);

  var readBuffer = new Buffer(testBuffer.length);
  var fd = fs.openSync(filename, 'rs')
  var read = 0;
  var errors = [];
  for(var i=startOffset; i<endOffset; i+=testBuffer.length) {
    read = 0
    while(read !== testBuffer.length) {
      read += fs.readSync(fd, readBuffer, read, testBuffer.length - read, i + read); 
    }
    if(readBuffer.length !== testBuffer.length) {
      errors.push('read length differ, expected ' + testBuffer.length + ' got: ' + readBuffer.length)
    } else if(readBuffer.toString() !== testBuffer.toString()) {
      errors.push('failed check at position ' + i);  
    }
    
    stats.update(i+testBuffer.length);    
  }  
  return {
    errors: errors,
    stats: stats,
  }
}

function getBlockDeviceInformation(filename) {
  var name = path.basename(filename);
  var deviceDirectory = sprintf('/sys/class/block/%s/device', name);
  var infos = {}
  fs.readdirSync(deviceDirectory).forEach(function(file) {
    filename = path.join(deviceDirectory, file);
    if(!fs.statSync(filename).isFile())
      return;
    var elements = fs.readFileSync(filename).toString().split('\n')
    elements.pop(); // remove last \n
    infos[file] = elements.join(';');
  });
  return infos;
}

function executeTest(filename) {
  var diskSize = getBlockDeviceSize(filename);
  var infos = getBlockDeviceInformation(filename);
  infos.diskSize = diskSize;

  var estimatedMaxMbps = 6*1024*1024;
  var maxTime = 30;
  var blockTime = 5;
  var testBuffer = getTestBuffer(64*1024);
  var writeResults = [];
  
  console.log('infos ' + JSON.stringify(infos, null, 4));
  console.log('disk size ' + diskSize);
  console.log('buffer length ' + testBuffer.length);

  if(process.argv.indexOf('write') !== -1) {
    var sliceSize = Math.floor(diskSize/((maxTime/blockTime)));
    for(var i=0; (i+sliceSize)<diskSize; i += sliceSize) {
      writeResults.push(writeTestData(filename, diskSize, testBuffer, i, blockTime));
    }    
  }
  var errors;
  var readResults = [];
  if(process.argv.indexOf('check') !== -1) {
    writeResults.forEach(function(r) {
      readResults.push(checkTestData(filename, diskSize, testBuffer, r.start, r.end));
    });    
  }
  
  var writeDataPoints = [];
  writeResults.forEach(function(result) {
    writeDataPoints.push(result.stats.getAverageBps());
  });

  var readDataPoints = [];
  var readErrors = [];
  readResults.forEach(function(result) {
    readDataPoints.push(result.stats.getAverageBps());
    readErrors = readErrors.concat(result.errors);
  });

  infos.test = {};
  infos.test.readBps = readDataPoints;
  infos.test.writeBps = writeDataPoints;
  infos.test.maxTime = maxTime;
  infos.test.blockTime = blockTime;  
  infos.test.bufferSize = testBuffer.length;  
  infos.test.versions = process.versions;
  infos.test.arch = process.arch;
  infos.test.kernel = os.release();
  infos.test.readErrors = readErrors;
  infos.test.sliceSize = sliceSize;

  return infos;
}

exports.executeTest = executeTest;

if (require.main === module) {
  var filename = '/dev/mmcblk1';
  var infos = executeTest(filename);
  fs.writeFileSync(infos.name + '.log', JSON.stringify(infos, null, 4));
  if(infos.test.readErrors.length) {
    console.log('ERROR FOUND!');
  }
  process.exit(infos.test.readErrors.length);
} 