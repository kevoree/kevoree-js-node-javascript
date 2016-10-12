'use strict';

var AdaptationPrimitive = require('kevoree-entities/lib/AdaptationPrimitive');
var RemoveInstance = require('./RemoveInstance');
var ModelHelper = require('../ModelHelper');

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
  execute: function(callback) {
    // do not add this node platform instance (this is done by the core)
    if (this.modelElement && (this.modelElement.name !== this.node.getName())) {
      // do not add already added instances
      if (!this.mapper.hasObject(this.modelElement.path())) {
        // retrieve the related installed DeployUnit
        var meta = this.modelElement.typeDefinition
          .select('deployUnits[]/filters[name=platform,value=js]');
        if (meta) {
          if (meta.array.length === 1) {
            var TypeDef = this.mapper.getObject(meta.get(0).eContainer().path());
            if (TypeDef) {
              var instance = new TypeDef(this.node.getKevoreeCore(), this.modelElement, this.node.getName());
              this.log.debug(this.toString(), instance.getName() + ': ' + ModelHelper.getFQN(this.modelElement.typeDefinition));
              this.mapper.addEntry(this.modelElement.path(), instance);
              callback();
              return;

            } else {
              // there is no DeployUnit installed for this instance TypeDefinition
              callback(new Error(this.toString() + ' error: no DeployUnit installed for ' + this.modelElement.path()));
              return;
            }
          } else {
            callback(new Error(this.toString() + ' error: TypeDefinitions must only have 1 DeployUnit for a specific platform (found '+meta.array.length+' in \'js\' for '+meta.get(0).eContainer().path()+')'));
            return;
          }
        } else {
          callback(new Error(this.toString() + ' error: unable to find a DeployUnit \'js\' for ' + this.modelElement.path() + ' in the model'));
          return;
        }
      }
    }

    callback();
  },

  undo: function(callback) {
    var cmd = new RemoveInstance(this.node, this.mapper, this.adaptModel, this.modelElement);
    cmd.execute(callback);
  }
});
