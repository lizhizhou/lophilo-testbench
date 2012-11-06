'use strict';

var fs = require('fs');
var assert = require('should');

var writeStream = fs.createWriteStream('testfile');
writeStream.on('error', function() {
  console.log('error!');
});

writeStream.on('open', function() {
  console.log('opened!');
  
  writeStream.on('drain', function() {
    console.log('drained!');
  });  

  for(var i=0; i<100; i++) {
    var ret = writeStream.write('hello\n');
    console.log('ret ' + ret); 
  }


  writeStream.end();
  writeStream.destroySoon();
});



