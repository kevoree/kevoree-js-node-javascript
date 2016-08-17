'use strict';

var AdaptationPrimitive = require('kevoree-entities').AdaptationPrimitive;
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
    // inception check
    if (this.modelElement && (this.modelElement.name !== this.node.getName())) {
      // platform related check
      // already added check
      if (!this.mapper.hasObject(this.modelElement.path())) {
        var TypeDef = this.mapper.getObject(this.modelElement.typeDefinition.select('deployUnits[name=*]/filters[name=platform,value=js]').get(0).eContainer().path());
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
      }
    }

    callback();
  },

  undo: function(callback) {
    var cmd = new RemoveInstance(this.node, this.mapper, this.adaptModel, this.modelElement);
    cmd.execute(callback);
  }
});
