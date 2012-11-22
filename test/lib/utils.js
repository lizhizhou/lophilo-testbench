var fs = require('fs');
var path = require('path');
var dnodeloader = require('dnode-dynamicloader');
var dnodeError = dnodeloader.err;

function record(id, value) {
  var filename = path.join(__dirname, '..', '..', 'results', process.env.LMC_MAC + '.' + id);
  console.log('recording to ' + filename);
  fs.writeFileSync(filename, value);
}

function cleanSerialGarbage(lcons, done) {
    console.log('writing');
    // get rid of any garbage that could be left on the command-line
    lcons.writeReadUntilDelimiter('\n', function(err, data) {
      console.log('cleaned console');
      if(err) return done(dnodeError(err));
      lcons.writeReadUntilDelimiter('\n', function(err, data) {
        console.log('cleaned console');
        if(err) return done(dnodeError(err));
        done();
      });
    });
}

exports.record = record;

exports.cleanSerialGarbage = cleanSerialGarbage;