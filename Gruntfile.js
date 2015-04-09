module.exports = function (grunt) {

    grunt.initConfig({
        // retrieve your project package.json
        pkg: grunt.file.readJSON('package.json'),

        // creates kevlib.json which represents your project Kevoree model
        // by parsing your pkg.main entry point
        kevoree_genmodel: {
            main: {
                options: { verbose: true }
            }
        },

        // publish your kevlib.json model to the Kevoree Registry
        kevoree_registry: { src: 'kevlib.json' },

        browserify: {
            browser: {
                options: {
                    alias: [ '<%= pkg.main %>:<%= pkg.name %>' ]
                },
                src: [],
                dest: 'browser/<%= pkg.name %>.js'
            }
        },

        uglify: {
            options: {
                mangle: {
                    except: ['_super']
                }
            },
            browser: {
                src: '<%= browserify.browser.dest %>',
                dest: 'browser/<%= pkg.name %>.min.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-kevoree');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-kevoree-genmodel');
    grunt.loadNpmTasks('grunt-kevoree-registry');

    grunt.registerTask('default', 'build');
    grunt.registerTask('build', ['kevoree_genmodel', 'browser']);
    grunt.registerTask('publish', ['kevoree_registry']);
    grunt.registerTask('kev', ['kevoree']);
    grunt.registerTask('browser', ['browserify', 'uglify']);
};