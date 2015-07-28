var AdaptationPrimitive = require('kevoree-entities').AdaptationPrimitive,
    timesUp             = require('times-up'),
    AddInstance         = require('./AddInstance');

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
    execute: function (callback) {
        if (this.modelElement.host && this.modelElement.host.name === this.node.getName()) {
            // this element is a subNode to this.node
            this.node.removeSubNode(this.modelElement, timesUp(this.node.getName() + '.removeSubNode(...)', 30000, function (err) {
                if (!err) {
                    this.log.debug(this.toString(), this.node.getName()+' removed '+this.modelElement.name);
                    // TODO ? add eventEmitter hook for subNode too ?
                }
                callback(err);
            }.bind(this)));
            return;

        } else {
            var instance = this.mapper.getObject(this.modelElement.path());
            if (instance) {
                this.mapper.removeEntry(this.modelElement.path());
                this.log.debug(this.toString(), instance.getName()+' '+this.modelElement.typeDefinition.path());
                this.node.kCore.emitter.emit('instanceRemoved', instance);
                callback();
                return;
            }
        }
        callback();
    },

    undo: function (callback) {
        var cmd = new AddInstance(this.node, this.mapper, this.adaptModel, this.modelElement);
        cmd.execute(callback);
    }
});