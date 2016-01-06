var path = require('path');
var AdaptationPrimitive = require('kevoree-entities').AdaptationPrimitive;
var RemoveInstance = require('./RemoveInstance');

/**
 * AddInstance Adaptation command
 *
 * @type {AddInstance} extends AdaptationPrimitive
 */
module.exports = AdaptationPrimitive.extend({
    toString: 'AddInstance',

    /**
     *
     * @param callback function: if this function first parameter != null it means that there is an error
     */
    execute: function (callback) {
        // inception check
        if (this.modelElement && (this.modelElement.name !== this.node.getName())) {
            // platform related check
            // already added check
            if (!this.mapper.hasObject(this.modelElement.path())) {
                var moduleName = this.mapper.getObject(this.modelElement.typeDefinition.select('deployUnits[name=*]/filters[name=platform,value=javascript]').get(0).eContainer().path());
                if ((moduleName !== undefined) && (moduleName !== null)) {
                    var InstanceClass;
                    try {
                        InstanceClass = require(path.resolve(this.node.kCore.modulesPath, 'node_modules', moduleName));
                    } catch (e) {
                        try {
                            InstanceClass = require(moduleName);
                        } catch (err) {
                            callback(err);
                            return;
                        }
                    }

                    var instance = new InstanceClass();
                    instance.setKevoreeCore(this.node.getKevoreeCore());
                    instance.setName(this.modelElement.name);
                    instance.setPath(this.modelElement.path());
                    instance.setNodeName(this.node.getName());

                    this.log.debug(this.toString(), instance.getName()+' '+this.modelElement.typeDefinition.path());
                    this.mapper.addEntry(this.modelElement.path(), instance);
                    callback();
                    return;

                } else {
                    // there is no DeployUnit installed for this instance TypeDefinition
                    callback(new Error(this.toString()+ " error: no DeployUnit installed for "+this.modelElement.path()));
                    return;
                }
            }
        }

        callback();
    },

    undo: function (callback) {
        var cmd = new RemoveInstance(this.node, this.mapper, this.adaptModel, this.modelElement);
        cmd.execute(callback);
    }
});
