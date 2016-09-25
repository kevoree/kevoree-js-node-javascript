'use strict';

describe('JavascriptNode test', function () {
  var instance;
  var JavascriptNode = KevoreeModuleLoader.require('kevoree-node-javascript', '5.4.0-alpha.5');
  var coreStub = {
    getLogger: function () {
      return {
        level: 'DEBUG',
        tag: 'StubLogger',
        info: function (tag, msg) {
          console.log('info '+tag+' '+msg);
        },
        debug: function (tag, msg) {
          console.log('debug '+tag+' '+msg);
        },
        warn: function (tag, msg) {
          console.log('warn '+tag+' '+msg);
        },
        error: function (tag, msg) {
          console.log('error '+tag+' '+msg);
        },
        setLevel: function () {},
        setFilter: function () {}
      };
    }
  };
  var elemStub = {
    name: 'node0',
    path: function () {
      return '/nodes['+this.name+']';
    }
  };

  beforeEach('create instance', function (done) {
    instance = new JavascriptNode(coreStub, elemStub, 'node0'); // jshint ignore:line
    instance.__start__(done);
  });

  it('should start the instance', function (done) {
    instance.start(done);
  });
});
