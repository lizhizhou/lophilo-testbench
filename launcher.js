'use strict';

var assert = require('assert');
var fs = require('fs');
var http = require('http');
var os = require('os');
var path = require('path');
var dns = require('dns');
var mdns = require('mdns');

var spawn = require('child_process').spawn;
var sprintf = require('sprintf').sprintf;

var LMC_LOPHILO_PATH = '/dnode?require=lophilo'

var processed = {};

function getHWAddress(ip) {
  //console.log('matching ' + ip);
  var interfaces = os.networkInterfaces();
  var hwaddress;
  var found = Object.keys(interfaces).some(function(interfaceName) {
    // console.log(interfaceName);
    return interfaces[interfaceName].some(function(potentialMatch) {
      // console.log(potentialMatch);
      if(potentialMatch.address === ip) {
        var interfaceFile = sprintf('/sys/class/net/%s/address', interfaceName);
        hwaddress = fs.readFileSync(interfaceFile)
            .toString()
            .match(/[\w:]+/g)[0];
        // console.log('match ' + hwaddress);
        return true;
      }
    });
  });

  if(!found) {
    var arpFileContent = fs.readFileSync('/proc/net/arp');
    var arps = arpFileContent.toString().split('\n');
    found = arps.some(function(arp) {
      if(arp.indexOf(ip) === 0) {
        // console.log('match! ' + arp);
        hwaddress = arp.match(/[\w:\.]+/g)[3];
        return true;
      }
    });
  }
  assert(found, 'could not find a match for ' + ip);
  assert('74:e5:0b:0d:19:be'.length == hwaddress.length, 'incorrect ' + hwaddress);
  return hwaddress;
}

function launchMocha(err, ip, port) {
  var mochaPath = require.resolve('mocha');
  var mochaBinPath = path.resolve(path.join(mochaPath, '..', 'bin', 'mocha'));
  var mac = processed[ip];

  console.log('mac: ' + mac);
  console.log('using ' + mochaBinPath);

  var log = fs.openSync(sprintf('./%s.log', mac), 'w+');
  var child = spawn(
    process.execPath, // path to node
    [mochaBinPath, '--reporter', 'json', 'test/'],
    {
      stdio: ['ignore', log, log],
      //stdio: 'inherit',
      cwd: __dirname,
      env: {
        LOPHILO_IP: ip,
        LOPHILO_PORT: port
      }
    }
  );
  child.on('exit', function() {
    console.log('child exited for ' + mac);
    //process.exit();
  })
}

function getDnodeHostnamePort(lmcIP, lmcPort, dnodePath, cb) {
  console.log('fetching dnode from ' + lmcIP);
  var req = http.get({host: lmcIP, port: lmcPort, path: dnodePath}, function(res) {
    var data = '';
    res.on('data', function (chunk) {
      data += chunk;
    });

    res.on('end', function() {
      if(res.statusCode >= 200 && res.statusCode < 400) {
        var port = parseInt(data);
        cb(null, lmcIP, port);
      }
    });
  });
  req.on('error', function(err) {
    console.log('error connecting to %s:%d', lmcIP, lmcPort);
  });
}

if (require.main === module) {
  var browser = mdns.createBrowser(mdns.tcp('http'));
  browser.on('serviceUp', function(service) {
    if(service.name.indexOf('lmc') === 0) {
      var ip = service.addresses[0];
      var mac = getHWAddress(ip);
      if(processed[mac]) {
        console.log('already processed ' + mac);
        return;
      }
      processed[mac] = ip;
      processed[ip] = mac;

      console.log('service ', service);
      getDnodeHostnamePort(
        ip,
        service.port,
        LMC_LOPHILO_PATH,
        launchMocha);
    }
  });
  browser.on('serviceDown', function(service) {
    console.log("service down: ", service);
  });
  browser.start();
  var server = http.createServer();
  server.listen(0);
}