'use strict';

var AdaptationPrimitive = require('kevoree-entities/lib/AdaptationPrimitive');

var HaraKiri = AdaptationPrimitive.extend({
  toString: 'HaraKiri',

  execute: function(callback) {
    var kCore = this.node.getKevoreeCore();
    this.log.debug(this.toString(), 'Hara-kiri requested: shutting down this runtime...');
    kCore.once('deployed', function() {
      if (!kCore.stopping) {
        kCore.stop();
      }
    }.bind(this));
    callback();
  },

  undo: function(callback) {
    callback();
  }
});

module.exports = HaraKiri;
