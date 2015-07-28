var AdaptationPrimitive = require('kevoree-entities').AdaptationPrimitive;
var AddDeployUnit = require('./AddDeployUnit');

/**
 * RemoveDeployUnit Adaptation
 *
 * @type {RemoveDeployUnit} extend AdaptationPrimitive
 */
module.exports = AdaptationPrimitive.extend({
    toString: 'RemoveDeployUnit',

    execute: function (callback) {
        if (this.modelElement) {
            var bootstrapper = this.node.getKevoreeCore().getBootstrapper();
            bootstrapper.uninstall(this.modelElement, function (err) {
                if (err) {
                    return callback(err);
                }

                this.log.debug(this.toString(), this.modelElement.path());
                this.mapper.removeEntry(this.modelElement.path());
                callback();
            }.bind(this));
        } else {
            callback();
        }
    },

    undo: function (callback) {
        var cmd = new AddDeployUnit(this.node, this.mapper, this.adaptModel, this.modelElement);
        cmd.execute(callback);
    }
});