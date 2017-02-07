'use strict';

var AdaptationPrimitive = require('kevoree-entities/lib/AdaptationPrimitive');
var RemoveBinding = require('./RemoveBinding');
var Input = require('kevoree-entities/lib/Input');

module.exports = AdaptationPrimitive.extend({
	toString: 'AddBinding',

	execute: function (callback) {
		var chanInstance = this.mapper.getObject(this.modelElement.hub.path());
		var compInstance = this.mapper.getObject(this.modelElement.port.eContainer().path());

		if (chanInstance) {
			if (compInstance) {
				// if compInstance is found then it means that the port is on this node
				if (this.modelElement.port.getRefInParent() === 'provided') {
					// binding related port is an 'in' port type
					var input = compInstance.inputs[this.modelElement.port.path()];
					chanInstance.addInputPort(input);
					this.log.debug(this.toString(), input.path + ' <-> ' + chanInstance.path);
				} else {
					// binding related port is an 'out' port type
					var output = compInstance.outputs[this.modelElement.port.path()];
					output.addChannel(chanInstance);
					this.log.debug(this.toString(), output.path + ' <-> ' + chanInstance.path);
				}

				callback();

			} else {
				if (this.modelElement.port.getRefInParent() === 'provided') {
					// only add input port
					chanInstance.addInputPort(new Input(this.modelElement.port.eContainer(), this.modelElement.port, true));
					this.log.debug(this.toString(), 'create remote input: ' + this.modelElement.port.path());
					this.log.debug(this.toString(), this.modelElement.port.path() + ' <-> ' + chanInstance.path);
				}
				callback();
			}
		} else {
			callback(new Error(this.toString() + ' error: unable to find channel ' + this.modelElement.hub.name + ' instance on platform.'));
		}
	},

	undo: function (callback) {
		var cmd = new RemoveBinding(this.node, this.mapper, this.adaptModel, this.modelElement);
		cmd.execute(callback);
	}
});
