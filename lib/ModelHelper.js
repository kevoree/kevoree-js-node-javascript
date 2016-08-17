'use strict';

module.exports = {
  getFQN: function (tdef) {
    return this.getNamespace(tdef.eContainer()) + '.' + tdef.name + '/' + tdef.version;
  },

  getNamespace: function (pkg) {
    var namespace = '';
    function walk(pkg) {
      if (pkg.eContainer()) {
        if (namespace.length > 0) {
          namespace = pkg.name + '.' + namespace;
        } else {
          namespace = pkg.name;
        }
        walk(pkg.eContainer());
      }
    }

    walk(pkg);

    return namespace;
  }
};
