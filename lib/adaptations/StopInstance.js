'use strict';

var AdaptationPrimitive = require('kevoree-entities').AdaptationPrimitive;
var timesUp = require('times-up');
var StartInstance = require('./StartInstance');

var StopInstance = AdaptationPrimitive.extend({
  toString: 'StopInstance',

  execute: function(callback) {
    if (this.modelElement.host && this.modelElement.host.name === this.node.getName()) {
      // this element is a subNode to this.node
      this.node.stopSubNode(this.modelElement, timesUp(this.node.getName() + '.stopSubNode(...)', 30000, function(err) {
        if (!err) {
          this.log.debug(this.toString(), this.node.getName() + ' stopped ' + this.modelElement.name);
          // TODO ? add eventEmitter hook for subNode too ?
        }
        callback(err);
      }.bind(this)));
      return;

    } else {
      var instance;
      if (this.modelElement.name === this.node.getName()) {
        instance = this.node;
      } else {
        instance = this.mapper.getObject(this.modelElement.path());
      }
      if (instance && instance.isStarted()) {
        try {
          instance.__stop__(timesUp('stop(...)', 30000, function(err) {
            if (err) {
              this.log.error(this.toString(), 'Unable to stop ' + instance.getPath());
            } else {
              this.log.debug(this.toString(), instance.getPath());
              this.node.kCore.emitter.emit('instanceStopped', instance);
            }
            callback(err);
          }.bind(this)));
        } catch (err) {
          this.log.error(this.toString(), 'Unable to stop ' + instance.getPath());
          callback(err);
        }
        return;
      }
    }

    this.log.warn(this.toString(), 'Nothing performed...shouldnt see that');
    callback();
  },

  undo: function(callback) {
    var cmd = new StartInstance(this.node, this.mapper, this.adaptModel, this.modelElement);
    cmd.execute(callback);
  }
});

module.exports = StopInstance;
