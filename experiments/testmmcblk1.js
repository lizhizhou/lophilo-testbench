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
var stringCount = 1;
var buffer = new Buffer(testString.length*stringCount);

for(var i=0; i<stringCount; i++) {
  buffer.write(testString, i*testString.length, testString.length, 'ascii');
}

var startTime = process.hrtime();
var lastTime = startTime;
var lastCount = 0;
var waiting = false;
console.log('disk size ' + disksize);
console.log('buffer length ' + buffer.length);
writeStream.on('drain', function() {
  console.log('drained!');
  waiting = false;
});

for(var i=0; i<disksize; i+=buffer.length) {
  if(!writeStream.write(buffer, 'ascii')) {
    waiting = true;
    process.nextTick();    
  }    

  var delta = process.hrtime(lastTime);
  if(delta[0] > 5) {
    var bps = (i - lastCount)/(delta[0]);
    var mbps = Math.round(bps / (1024*1024));
    var completion = Math.round(((i/disksize)*100));
    if(waiting) {
      console.log('waiting...');
    }
    console.log('bytes written: ' + i + ' total %' + completion + ' mbps ' + mbps);

    lastCount = i;
    lastTime = process.hrtime();
  }
}

writeStream.end();

var delta = process.hrtime(startTime);
console.log('write completed in ' + delta);

var readStream = fs.createReadStream(
  '/dev/mmcblk1', 
  {
    encoding: 'ascii',
    bufferSize: blocksize
  });

var currentPos = 0;
readStream.on('data', function(data) {
  var index = data.indexOf('0');
  for(var i=index; i<data.length; i++) {
    assert(data[i] === testString[i%16]);
  }
  currentPos += data.length;
});
 