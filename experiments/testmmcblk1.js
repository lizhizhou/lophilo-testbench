'use strict';

var fs = require('fs');
var assert = require('should');

var writeStream = fs.createWriteStream('/dev/mmcblk1', {
  encoding: 'ascii'
});

writeStream.on('error', function(exception) {
  console.error(exception.stack);
  throw exception;
});

var disksize = parseInt(fs.readFileSync('/sys/class/block/mmcblk1/size').toString())*512;
var blocksize = 4096;
var repeatedString = '';
var testString = '0123456789ABCDEF';
var stringCount = 4096;
var buffer = new Buffer(testString.length*stringCount);

for(var i=0; i<stringCount; i++) {
  buffer.write(testString, i*testString.length, testString.length, 'ascii');
}

var startTime = process.hrtime();
var lastTime = startTime;
var lastCount = 0;
var written = 0;
console.log('disk size ' + disksize);
console.log('buffer length ' + buffer.length);

var fd = fs.openSync('/dev/mmcblk1', 'w')
for(var i=0; i<disksize; i+=buffer.length) {
  written = 0;
  while(written !== buffer.length) {
    written += fs.writeSync(fd, buffer, written, buffer.length - written, i + written);  
  }

  var delta = process.hrtime(lastTime);
  if(delta[0] > 5) {
    var bps = (i - lastCount)/(delta[0]);
    var mbps = Math.round(bps / (1024*1024));
    var completion = Math.round(((i/disksize)*100));
    console.log('bytes written: ' + i + ' total %' + completion + ' mbps ' + mbps);

    lastCount = i;
    lastTime = process.hrtime();
  }
}

fs.closeSync(fd);

var delta = process.hrtime(startTime);
console.log('write completed in ' + delta);

var readBuffer = new Buffer(buffer.length);
fd = fs.openSync('/dev/mmcblk1', 'r')
var read = 0;
for(var i=0; i<disksize; i+=buffer.length) {
  read = 0
  while(read !== buffer.length) {
    read += fs.readSync(fd, readBuffer, read, buffer.length - read, i + read); 
  }
  assert(readBuffer.toString() === buffer.toString());
}