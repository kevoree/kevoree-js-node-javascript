'use strict';

var AdaptationPrimitive = require('kevoree-entities').AdaptationPrimitive;
var AddBinding = require('./AddBinding');

module.exports = AdaptationPrimitive.extend({
  toString: 'RemoveBinding',

  execute: function(callback) {
    var chanInstance = this.mapper.getObject(this.modelElement.hub.path()),
      compInstance = this.mapper.getObject(this.modelElement.port.eContainer().path()),
      portInstance = null;

    if (chanInstance && compInstance) {
      var provided = this.modelElement.port.eContainer().findProvidedByID(this.modelElement.port.name);
      if (provided) {
        portInstance = compInstance.inputs[this.modelElement.port.path()];
        this.log.debug(this.toString(), 'input ' + portInstance.path + ' <-> ' + chanInstance.path);
        chanInstance.removeInputPort(portInstance);
      } else {
        portInstance = compInstance.outputs[this.modelElement.port.path()];
        this.log.debug(this.toString(), 'output ' + portInstance.path + ' <-> ' + chanInstance.path);
        portInstance.removeChannel(chanInstance);
      }

      // retrieve every bindings related to this binding chan
      var bindings = this.modelElement.hub.bindings.iterator();
      while (bindings.hasNext()) {
        var binding = bindings.next();
        if (binding !== this.modelElement) { // ignore this binding because we are already processing it
          provided = binding.port.eContainer().findProvidedByID(binding.port.name);
          if (provided) {
            portInstance = this.mapper.getObject(provided.path());
            if (portInstance) {
              this.mapper.removeEntry(provided.path());
              chanInstance.removeInternalInputPort(portInstance);
              portInstance.removeChannel(chanInstance);
            }
          }
        }
      }
    }

    callback();
  },

  undo: function(callback) {
    var cmd = new AddBinding(this.node, this.mapper, this.adaptModel, this.modelElement);
    cmd.execute(callback);
  },

  isInputPortType: function(kPort) {
    var kCompTD = kPort.eContainer().typeDefinition;
    var inputs = kCompTD.provided ? kCompTD.provided.iterator() : null;
    if (inputs) {
      while (inputs.hasNext()) {
        var input = inputs.next();
        if (input.name === kPort.name) {
          return true;
        }
      }
    }

    var outputs = kCompTD.required ? kCompTD.required.iterator() : null;
    if (outputs) {
      while (outputs.hasNext()) {
        var output = outputs.next();
        if (output.name === kPort.name) {
          return false;
        }
      }
    }

    return false;
  }
});
