'use strict';

var AdaptationPrimitive = require('kevoree-entities/lib/AdaptationPrimitive');
var AddBinding = require('./AddBinding');

module.exports = AdaptationPrimitive.extend({
	toString: 'RemoveBinding',

	execute: function (callback) {
		var chanInstance = this.mapper.getObject(this.modelElement.hub.path());
		var compInstance = this.mapper.getObject(this.modelElement.port.eContainer().path());

		if (chanInstance) {
			var isRemote = this.modelElement.port.eContainer().eContainer().path() !== this.node.path;
			if (this.modelElement.port.getRefInParent() === 'provided') {
				// input port
				if (isRemote) {
					var remoteInput = chanInstance.inputs[this.modelElement.port.path()];
					chanInstance.removeInputPort(remoteInput);
					this.log.debug(this.toString(), remoteInput.path + ' <-> ' + chanInstance.path);
				} else {
					var localInput = compInstance.inputs[this.modelElement.port.path()];
					chanInstance.removeInputPort(localInput);
					this.log.debug(this.toString(), remoteInput.path + ' <-> ' + chanInstance.path);
				}

			} else {
				// output port
				if (!isRemote) {
					var localOutput = compInstance.outputs[this.modelElement.port.path()];
					this.log.debug(this.toString(), localOutput.path + ' <-> ' + chanInstance.path);
					localOutput.removeChannel(chanInstance);
				}
			}
		}

		callback();
	},

	undo: function (callback) {
		var cmd = new AddBinding(this.node, this.mapper, this.adaptModel, this.modelElement);
		cmd.execute(callback);
	},

	isInputPortType: function (kPort) {
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
