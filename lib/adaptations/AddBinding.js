var AdaptationPrimitive = require('kevoree-entities').AdaptationPrimitive,
  Port = require('kevoree-entities').Port,
  RemoveBinding = require('./RemoveBinding');

module.exports = AdaptationPrimitive.extend({
  toString: 'AddBinding',

  execute: function(callback) {
    var bindings, binding;

    var chanInstance = this.mapper.getObject(this.modelElement.hub.path()),
      compInstance = this.mapper.getObject(this.modelElement.port.eContainer().path()),
      portInstance = this.mapper.getObject(this.modelElement.port.path());

    if (chanInstance) {
      if (compInstance) {
        if (!portInstance) {
          portInstance = new Port(this.modelElement.port.name, this.modelElement.port.path());
          this.mapper.addEntry(this.modelElement.port.path(), portInstance);
        }
        portInstance.setComponent(compInstance);
        portInstance.setChannel(chanInstance);

        var provided = this.modelElement.port.eContainer().findProvidedByID(this.modelElement.port.name);
        if (provided) {
          // binding related port is an 'in' port type
          compInstance.addInternalInputPort(portInstance);
          chanInstance.addInternalInputPort(portInstance);
          this.log.debug(this.toString(), 'input ' + portInstance.getPath() + ' <-> ' + chanInstance.getPath());
        } else {
          // binding related port is an 'out' port type
          // so we need to get all this channel 'in' ports
          // and give them to this chan fragment
          compInstance.addInternalOutputPort(portInstance);
          this.log.debug(this.toString(), 'output ' + portInstance.getPath() + ' <-> ' + chanInstance.getPath());

          // retrieve every bindings related to this binding chan
          bindings = this.modelElement.hub.bindings.iterator();
          while (bindings.hasNext()) {
            binding = bindings.next();
            if (binding != this.modelElement) { // ignore this binding because we are already processing it
              provided = binding.port.eContainer().findProvidedByID(binding.port.name);
              if (provided) {
                portInstance = this.mapper.getObject(provided.path());
                if (!portInstance) {
                  portInstance = new Port(provided.name, provided.path());
                  this.mapper.addEntry(provided.path(), portInstance);
                }
                chanInstance.addInternalInputPort(portInstance);
                var inComp = this.mapper.getObject(binding.port.eContainer().path());
                if (inComp) {
                  inComp.addInternalInputPort(portInstance);
                  portInstance.setComponent(inComp);
                }
              }
            }
          }
        }

        callback();

      } else {
        if (this.modelElement.port.eContainer().eContainer().path() === this.node.getPath()) {
          callback(new Error(this.toString() + " error: unable to find component " + this.modelElement.port.eContainer().name + " instance on platform."));
        } else {
          // the component is not related to the current platform, just add the input for the channel
          var isProvided = this.modelElement.port.eContainer().findProvidedByID(this.modelElement.port.name);
          if (isProvided) {
            // only add provided ones
            chanInstance.addInternalInputPort(new Port(this.modelElement.port.name, this.modelElement.port.path()));
            this.log.debug(this.toString(), 'input ' + this.modelElement.port.path() + ' <-> ' + chanInstance.getPath());
          }
          callback();
        }
      }
    } else {
      callback(new Error(this.toString() + " error: unable to find channel " + this.modelElement.hub.name + " instance on platform."));
    }
  },

  undo: function(callback) {
    var cmd = new RemoveBinding(this.node, this.mapper, this.adaptModel, this.modelElement);
    cmd.execute(callback);
  }
});
