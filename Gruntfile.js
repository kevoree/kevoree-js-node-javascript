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
            standalone: {
                options: {
                    browserifyOptions: {
                        standalone: 'KevoreeNodeJavascript'
                    }
                },
                src: ['<%= pkg.main %>'],
                dest: 'browser/<%= pkg.name %>.js'
            },
            require: {
                options: {
                    alias: [ '<%= pkg.main %>:<%= pkg.name %>' ],
                    external: ['kevoree-model']
                },
                src: [],
                dest: 'browser/<%= pkg.name %>.require.js'
            }
        },

        uglify: {
            options: {
                banner: '// Browserify bundle of <%= pkg.name %>@<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd HH:MM") %>\n',
                mangle: {
                    except: ['_super']
                }
            },
            standalone: {
                src: '<%= browserify.standalone.dest %>',
                dest: 'browser/<%= pkg.name %>.min.js'
            },
            require: {
                src: '<%= browserify.require.dest %>',
                dest: 'browser/<%= pkg.name %>.require.min.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-kevoree');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-kevoree-genmodel');
    grunt.loadNpmTasks('grunt-kevoree-registry');

    grunt.registerTask('default', 'build');
    grunt.registerTask('build', ['kevoree_genmodel']);
    grunt.registerTask('publish', ['kevoree_registry']);
    grunt.registerTask('kev', ['kevoree']);
    grunt.registerTask('browser', ['browserify', 'uglify']);
};