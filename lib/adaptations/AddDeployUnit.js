var AdaptationPrimitive = require('kevoree-entities').AdaptationPrimitive;
var RemoveDeployUnit = require('./RemoveDeployUnit');

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

      bootstrapper.bootstrap(this.modelElement, false, function(err) {
        if (err) {
          callback(err);
        } else {
          // bootstrap success: add deployUnit path & packageName into mapper
          this.log.debug(this.toString(), this.modelElement.path());
          this.mapper.addEntry(this.modelElement.path(), this.modelElement.name);
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
