'use strict';

var AdaptationPrimitive = require('kevoree-entities/lib/AdaptationPrimitive'),
  timesUp = require('times-up'),
  AddInstance = require('./AddInstance');

/**
 * RemoveInstance Adaptation command
 *
 * @type {RemoveInstance} extends AdaptationPrimitive
 */
module.exports = AdaptationPrimitive.extend({
  toString: 'RemoveInstance',

  /**
   *
   * @param callback function: if this function first parameter != null it means that there is an error
   */
  execute: function(callback) {
    if (this.modelElement.host && this.modelElement.host.name === this.node.getName()) {
      // this element is a subNode to this.node
      this.node.removeSubNode(this.modelElement, timesUp(this.node.getName() + '.removeSubNode(...)', 30000, function(err) {
        if (!err) {
          this.log.debug(this.toString(), this.node.getName() + ' removed ' + this.modelElement.name);
          // TODO ? add eventEmitter hook for subNode too ?
        }
        callback(err);
      }.bind(this)));
      return;

    } else {
      var instance = this.mapper.getObject(this.modelElement.path());
      if (instance) {
        if (this.modelElement.getRefInParent() === 'components') {
          // check if there is binding to remove in current channels
          this.node.kCore.currentModel.mBindings.array.forEach(function(binding) {
            if (binding.port && binding.port.eContainer() && binding.port.eContainer().path() === instance.path) {
              var chan = this.mapper.getObject(binding.hub.path());
              var port = this.mapper.getObject(binding.port.path());
              if (chan && port && binding.port.getRefInParent() === 'provided') {
                // unload old binding in channel instance
                chan.removeInternalInputPort(port);
              }
            }
          }.bind(this));
        }
        this.mapper.removeEntry(this.modelElement.path());
        this.log.debug(this.toString(), instance.getName() + ' ' + this.modelElement.typeDefinition.path());
        this.node.kCore.emitter.emit('instanceRemoved', instance);
        callback();
        return;
      }
    }
    callback();
  },

  undo: function(callback) {
    var cmd = new AddInstance(this.node, this.mapper, this.adaptModel, this.modelElement);
    cmd.execute(callback);
  }
});
