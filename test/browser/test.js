'use strict';
var JavascriptNode = require('kevoree-node-javascript');

describe('JavascriptNode test', function () {
  var instance;

  beforeEach('create instance', function () {
    instance = new JavascriptNode();
  });

  it('should start the instance', function (done) {
    instance.start(done);
  });
});
