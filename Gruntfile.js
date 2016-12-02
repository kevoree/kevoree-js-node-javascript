'use strict';

var webpackConfig = require('./webpack.config');

module.exports = function (grunt) {

  grunt.initConfig({
    // retrieve your project package.json
    pkg: grunt.file.readJSON('package.json'),

    // creates kevlib.json which represents your project Kevoree model
    // by parsing your pkg.main entry point
    kevoree_genmodel: {
      main: {
        options: {}
      }
    },

    kevoree: {
      main: {
        options: {
          useGlobalRuntime: true
          // skipIntegrityCheck: true
        }
      }
    },

    // publish your kevlib.json model to the Kevoree Registry
    kevoree_registry: {
      src: 'kevlib.json'
    },

    webpack: {
      main: webpackConfig
    }
  });

  grunt.loadNpmTasks('grunt-kevoree');
  grunt.loadNpmTasks('grunt-kevoree-genmodel');
  grunt.loadNpmTasks('grunt-kevoree-registry');
  grunt.loadNpmTasks('grunt-webpack');

  grunt.registerTask('default', 'build');
  grunt.registerTask('build', ['kevoree_genmodel', 'browser']);
  grunt.registerTask('browser', 'webpack');
  grunt.registerTask('kev', ['kevoree_genmodel', 'kevoree']);
  grunt.registerTask('publish', ['kevoree_genmodel', 'kevoree_registry']);
};
