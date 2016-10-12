'use strict';

var AdaptationPrimitive = require('kevoree-entities/lib/AdaptationPrimitive'),
  RemoveBinding = require('./RemoveBinding');

module.exports = AdaptationPrimitive.extend({
  toString: 'AddBinding',

  execute: function(callback) {
    var bindings, binding;

    var chanInstance = this.mapper.getObject(this.modelElement.hub.path()),
      compInstance = this.mapper.getObject(this.modelElement.port.eContainer().path()),
      portInstance = null;

    if (chanInstance) {
      if (compInstance) {
        var provided = this.modelElement.port.eContainer().findProvidedByID(this.modelElement.port.name);
        if (provided) {
          // binding related port is an 'in' port type
          portInstance = compInstance.inputs[this.modelElement.port.path()];
          chanInstance.addInputPort(portInstance);
          this.log.debug(this.toString(), 'input ' + portInstance.path + ' <-> ' + chanInstance.path);
        } else {
          // binding related port is an 'out' port type
          portInstance = compInstance.outputs[this.modelElement.port.path()];
          portInstance.addChannel(chanInstance);
          // retrieve every bindings related to this binding chan
          this.log.debug(this.toString(), 'output ' + portInstance.path + ' <-> ' + chanInstance.path);
          bindings = this.modelElement.hub.bindings.iterator();
          while (bindings.hasNext()) {
            binding = bindings.next();
            if (binding !== this.modelElement) { // ignore this binding because we are already processing it
              provided = binding.port.eContainer().findProvidedByID(binding.port.name);
              if (provided) {
                compInstance = this.mapper.getObject(provided.eContainer().path());
                portInstance = compInstance.inputs[provided.path()];
                chanInstance.addInputPort(portInstance);
              }
            }
          }
        }

        callback();

      } else {
        if (this.modelElement.port.eContainer().eContainer().path() === this.node.path) {
          callback(new Error(this.toString() + ' error: unable to find component ' + this.modelElement.port.eContainer().name + ' instance on platform.'));
        } else {
          // the component is not related to the current platform, just add the input for the channel
          var isProvided = this.modelElement.port.eContainer().findProvidedByID(this.modelElement.port.name);
          if (isProvided) {
            // only add provided ones
            // chanInstance.addInputPort(new Input(this.modelElement.port.name, this.modelElement.port.path()));
            // this.log.debug(this.toString(), 'input ' + this.modelElement.port.path() + ' <-> ' + chanInstance.path);
            console.log('Hmm should addInputPort ' + this.modelElement.port.path() + ' to ' + chanInstance.path);
          }
          callback();
        }
      }
    } else {
      callback(new Error(this.toString() + ' error: unable to find channel ' + this.modelElement.hub.name + ' instance on platform.'));
    }
  },

  undo: function(callback) {
    var cmd = new RemoveBinding(this.node, this.mapper, this.adaptModel, this.modelElement);
    cmd.execute(callback);
  }
});
