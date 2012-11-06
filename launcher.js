'use strict';

var assert = require('assert');
var fs = require('fs');
var http = require('http');
var os = require('os');
var path = require('path');

var spawn = require('child_process').spawn;
var sprintf = require('sprintf').sprintf;

var lmcLophiloPath = '/dnode?require=lophilo'

function getHWAddress(ip) {
  console.log('matching ' + ip);
  var interfaces = os.networkInterfaces();
  var hwaddress;
  var found = Object.keys(interfaces).some(function(interfaceName) {
    return interfaces[interfaceName].some(function(potentialMatch) {
      if(potentialMatch.address === ip) {
        hwaddress = fs.readFileSync(sprintf('/sys/class/net/%s/address', interfaceName)).toString();
        return true;
      }
    });
  });

  if(!found) {
    var arpFileContent = fs.readFileSync('/proc/net/arp');
    var arps = arpFileContent.toString().split('\n');
    found = arps.some(function(arp) {
      if(arp.indexOf(ip) === 0) {
        hwaddress = arp.match(/\w+/g)[3];
        return true;
      }
    });
  }
  assert(found, 'could not find a match for ' + ip);
  return hwaddress;
}

function launchMocha(err, hostname, port) {
  var mochaPath = require.resolve('mocha');
  var mochaBinPath = path.resolve(path.join(mochaPath, '..', 'bin', 'mocha'));
  var mac = getHWAddress(hostname);
  console.log('mac: ' + mac);
  console.log('using ' + mochaBinPath);
  var child = spawn(
    process.execPath, // path to node
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
  child.on('exit', function() {
    process.exit();
  })
}

function getDnodeHostnamePort(lmcHostname, lmcPort, dnodePath, cb) {
  http.get({host: lmcHostname, port: lmcPort, path: dnodePath}, function(res) {
    var data = '';
    res.on('data', function (chunk) {
      data += chunk;
    });

    res.on('end', function() {
      if(res.statusCode >= 200 && res.statusCode < 400) {
        var port = parseInt(data);
        cb(null, lmcHostname, port)
      }
    });
  });
}

if (require.main === module) {
  var polo = require('polo');
  var apps = polo();
  // up fires everytime some service joins
  apps.once('up', function(name, service) {
    // should print out the joining service
    console.log(apps.get('http://{lmc}'));
    var lmc = apps.get('lmc');
    if(lmc) {
      getDnodeHostnamePort(lmc.host, lmc.port, lmcLophiloPath, launchMocha);
    }
  });
}