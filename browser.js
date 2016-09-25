var pkg = require('./package.json');
var JavascriptNode = require('./lib/JavascriptNode');

KevoreeModuleLoader.register(pkg.name, pkg.version, JavascriptNode);
