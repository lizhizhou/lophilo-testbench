'use strict';

var assert = require('assert');
var dns = require('dns');
var fs = require('fs');
var http = require('http');
var mdns = require('mdns');
var os = require('os');
var path = require('path');

var spawn = require('child_process').spawn;
var sprintf = require('sprintf').sprintf;

var processed = {};

function getHWAddress(ip) {
  assert(typeof ip === 'string', 'ip must be a valid string');
  //console.log('matching ' + ip);
  var interfaces = os.networkInterfaces();
  var hwaddress  = null;
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
  if(!found) {
    console.error('could not find a match for ' + ip);
    return null;
  }

  if('74:e5:0b:0d:19:be'.length != hwaddress.length) {
    console.error('incorrect ' + hwaddress);
    return null;
  }

  return hwaddress;
}

function launchMocha(ip, port) {
  assert(ip);
  assert(port);
  var mochaPath = require.resolve('mocha');
  var mochaBinPath = path.resolve(path.join(mochaPath, '..', 'bin', 'mocha'));
  var mac = processed[ip];

  console.log('mac: ' + mac);
  console.log('using ' + mochaBinPath);

  var logFilenameStdout =  path.join(__dirname, 'results', sprintf('%s.stdout', mac))
  var logStdout = fs.openSync(logFilenameStdout, 'w+');
  var logFilenameStderr =  path.join(__dirname, 'results', sprintf('%s.stderr', mac))
  var logStderr = fs.openSync(logFilenameStderr, 'w+');

  var configFilename = path.join(__dirname, 'results', sprintf('%s.config', mac))
  var configInformation = sprintf(
      'export LMC_IP=%s\n' +
      'export LMC_PORT=%s\n' +
      'export LMC_MAC=%s'
      , ip, port, mac)
  fs.writeFileSync(configFilename, configInformation);

  var child = spawn(
    mochaBinPath,
    [
      '--reporter', 'json',
      '-t', '60000',
      'test/audio.js',
      'test/leds.js',
      'test/mmcblk1.js',
      'test/simple.js',
      'test/ft2232.js',
      'test/loopback.js',
    ],
    {
      stdio: ['ignore', logStdout, logStderr], // stdin, stdout, stderr
      //stdio: 'inherit',
      cwd: __dirname,
      env: {
        PATH: '/home/rngadam/local/node/bin',
        LMC_IP: ip,
        LMC_PORT: port,
        LMC_MAC: mac
      }
    }
  );
  child.on('exit', function(exitcode, signal) {
    console.log(JSON.stringify(arguments));
    if(exitcode !== 0) {
      console.log('test failed for MAC %s IP %s PORT %d (exit: %d)', mac, ip, port, exitcode);
    } else {
      console.log('test successful for MAC %s IP %s PORT %d', mac, ip, port);
    }
  })
}
function filterLophilo(address) {
  console.log('filtering on ' + address);
  return true;
}

if (require.main === module) {
  var sequence = [
      mdns.rst.DNSServiceResolve(),
      //mdns.rst.DNSServiceGetAddrInfo({families: [4] },
      mdns.rst.getaddrinfo(),
      mdns.rst.makeAddressesUnique(),
      mdns.rst.logService(),
      mdns.rst.filterAdresses(filterLophilo),
  ];

  var browser = mdns.createBrowser(
    mdns.tcp('http')
    /*{resolverSequence: sequence}*/
    );

  browser.on('serviceUp', function(service) {
    if(service.name.indexOf('lmc') === 0) {
      var ip = service.addresses[0];
      if(!ip) {
        console.error('no ip for this service' + JSON.stringify(service));
        return;
      }
      var mac = getHWAddress(ip);
      if(!mac) {
        console.error('no mac for this service' + JSON.stringify(service));
        return;
      }

      if(processed[mac]) {
        //console.log('already processing ' + mac);
        return;
      }
      processed[mac] = ip;
      processed[ip] = mac;

      //console.log('service ', service);
      launchMocha(ip, service.port)
    }
  });
  browser.on('serviceDown', function(service) {
    console.log("service down: ", service);
  });

  browser.on('error', function(exception) {
    console.error('mdns browser error ' + exception);
  });
  browser.start();

  // TODO: how to keep from exiting?!
  var server = http.createServer();
  server.listen(0);
}
