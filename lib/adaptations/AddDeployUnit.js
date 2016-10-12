'use strict';

var AdaptationPrimitive = require('kevoree-entities/lib/AdaptationPrimitive');
var RemoveDeployUnit = require('./RemoveDeployUnit');
var ModelHelper = require('../ModelHelper');

/**
 * AddDeployUnit Adaptation command
 *
 * @type {AddDeployUnit} extends AdaptationPrimitive
 */
module.exports = AdaptationPrimitive.extend({
  toString: 'AddDeployUnit',

  /**
   *
   * @param callback function: if this function first parameter != null it means that there is an error
   */
  execute: function(callback) {
    if (!this.mapper.hasObject(this.modelElement.path())) {
      var bootstrapper = this.node.getKevoreeCore()
        .getBootstrapper();

      bootstrapper.bootstrap(this.modelElement, false, function (err, TypeDef) {
        if (err) {
          callback(err);
        } else {
          // bootstrap success: add deployUnit path & packageName into mapper
          this.log.debug(this.toString(), 'namespace=' + ModelHelper.getNamespace(this.modelElement.eContainer()) + ',hash=' + this.modelElement.hashcode + ',name=' + this.modelElement.name + ',version=' + this.modelElement.version);
          this.mapper.addEntry(this.modelElement.path(), TypeDef);
          callback();
        }
      }.bind(this));
    } else {
      // this deploy unit is already installed, move on
      callback();
    }
  },

  undo: function(callback) {
    var cmd = new RemoveDeployUnit(this.node, this.mapper, this.adaptModel, this.modelElement);
    cmd.execute(callback);
  }
});
