'use strict';

var sprintf = require('sprintf').sprintf;
var spawn = require('child_process').spawn;
var http = require('http');
var path = require('path');

var lmcHostname = 'rngadam-think';
var lmcPort = 3000;
var lmcLophiloPath = '/dnode?require=lophilo'

function launchMocha(hostname, port) {
  var mochaPath = require.resolve('mocha');
  var mochaBinPath = path.resolve(path.join(mochaPath, '..', 'bin', 'mocha'));
  console.log('using ' + mochaBinPath);
  spawn(
    process.execPath, // node
    [mochaBinPath, 'test/'],
    {
      stdio: 'inherit',
      cwd: __dirname,
      env: {
        LOPHILO_IP: hostname,
        LOPHILO_PORT: port
      }
    }
  );
}

http.get({host: lmcHostname, port: lmcPort, path: lmcLophiloPath}, function(res) {
  var data = '';
  res.on('data', function (chunk) {
    data += chunk;
  });

  res.on('end', function() {
    if(res.statusCode >= 200 && res.statusCode < 400) {
      var port = parseInt(data);
      launchMocha(lmcHostname, port)
    }
  });
});