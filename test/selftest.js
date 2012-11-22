var utils = require('./lib/utils');
var assert = require('should');
var fakelcons = {
  writeReadUntilDelimiter: function(value, callback) {
    callback(null, 'testdata');
  }
};
describe('self-test', function() {
    it('cleanSerialGarbage', function(done) {
      utils.cleanSerialGarbage(fakelcons, function(err, data) {
        assert(!err);
        done();
      });
    });
});