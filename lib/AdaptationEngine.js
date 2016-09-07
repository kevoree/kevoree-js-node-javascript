'use strict';

var kevoree = require('kevoree-library').org.kevoree,
  Kotlin = require('kevoree-kotlin'),
  ModelObjectMapper = require('./ModelObjectMapper');

// Adaptation Primitives
var AddInstance = require('./adaptations/AddInstance'),
  AddBinding = require('./adaptations/AddBinding'),
  AddDeployUnit = require('./adaptations/AddDeployUnit'),
  RemoveBinding = require('./adaptations/RemoveBinding'),
  RemoveInstance = require('./adaptations/RemoveInstance'),
  StartInstance = require('./adaptations/StartInstance'),
  StopInstance = require('./adaptations/StopInstance'),
  UpdateInstance = require('./adaptations/UpdateInstance'),
  UpdateDictionary = require('./adaptations/UpdateDictionary'),
  HaraKiri = require('./adaptations/HaraKiri');


// CONSTANTS
var COMMAND_RANK = {
  // highest priority
  StopInstance: 0,
  RemoveBinding: 1,
  RemoveInstance: 2,
  RemoveTypeDef: 3,
  RemoveDeployUnit: 4,
  AddDeployUnit: 5,
  AddTypeDef: 6,
  AddInstance: 7,
  AddBinding: 8,
  UpdateDictionary: 9,
  UpdateInstance: 10,
  StartInstance: 11,
  HaraKiri: 12
    // lowest priority
};

/**
 * AdaptationEngine knows each AdaptationPrimitive command available
 * for JavascriptNode.
 * Plus, it handles model - object mapping
 *
 * @type {AdaptationEngine}
 */
function AdaptationEngine(node) {
  this.node = node;
  this.modelObjMapper = new ModelObjectMapper();
  var factory = new kevoree.factory.DefaultKevoreeFactory();
  this.compare = factory.createModelCompare();
  this.alreadyProcessedTraces = {};
  this.targetModel = null;
}
AdaptationEngine.prototype = {

  /**
   * Process traces to find the right adaptation primitive command
   * Returns a command to execute in order to do the adaptation logic
   * @param diffSeq
   * @param targetModel
   * @returns {Array}
   */
  processTraces: function (diffSeq, targetModel) {
    this.targetModel = targetModel;

    // know if a trace has already been added to cmdList for {path <-> AdaptationPrimitive}
    var traceAlreadyProcessed = function (cmd) {
      return this.alreadyProcessedTraces[cmd.modelElement.path()] && this.alreadyProcessedTraces[cmd.modelElement.path()][cmd.toString()];
    }.bind(this);

    // add a trace to the processed trace map
    var addProcessedTrace = function (cmd) {
      this.alreadyProcessedTraces[cmd.modelElement.path()] = this.alreadyProcessedTraces[cmd.modelElement.path()] || {};
      this.alreadyProcessedTraces[cmd.modelElement.path()][cmd.toString()] = cmd;
    }.bind(this);

    // fill adaptation primitives list
    var cmdList = [];
    diffSeq.traces.array.forEach(function (trace) {
      // if (trace.traceType.name() === 'SET') {
      //   if (trace.srcPath.startsWith('/nodes[node0]/') && trace.srcPath.indexOf('/dictionary[') !== -1) {
      //     console.log(trace.srcPath, trace.content);
      //     var elem = targetModel.findByPath(trace.srcPath);
      //     console.log('elem', elem);
      //   }
      // }
      this.processTrace(trace).forEach(function (cmd) {
        if (!traceAlreadyProcessed(cmd)) {
          cmdList.push(cmd);
          addProcessedTrace(cmd);
          return cmd;
        }
      });
    }.bind(this));

    // clean primitives:
    //  - don't call UpdateInstance when StopInstance will be executed
    for (var path in this.alreadyProcessedTraces) {
      if (this.alreadyProcessedTraces[path][UpdateInstance.prototype.toString()]) {
        for (var type in this.alreadyProcessedTraces[path]) {
          if (type === StopInstance.prototype.toString() || type === StartInstance.prototype.toString()) {
            var index = cmdList.indexOf(this.alreadyProcessedTraces[path][UpdateInstance.prototype.toString()]);
            if (index > -1) {
              cmdList.splice(index, 1);
            }
          }
        }
      }
    }

    // free-up some mem
    this.targetModel = null;
    this.alreadyProcessedTraces = {};

    //return sorted command list (sort by COMMAND_RANK in order to process adaptations properly)
    // this.sortCommands(cmdList).forEach(function (cmd) {
    //   var tag = cmd.toString();
    //   while (tag.length < 20) {
    //     tag += ' ';
    //   }
    //   console.log(tag, cmd.modelElement.path());
    // });

    return this.sortCommands(cmdList);
  },

  /**
   * Creates an array of AdaptationPrimitive according to the trace
   * @param trace
   */
  processTrace: function (trace) {
    var cmds = [],
        modelElement = this.targetModel.findByPath(trace.previousPath || trace.srcPath),
        currentModel,
        instance,
        du,
        meta,
        currentModelElement,
        targetModelElement;

    if (modelElement) {
      if (!this.isVirtual(modelElement)) {
        switch (trace.refName) {
          case 'groups':
          case 'hosts':
          case 'components':
            switch (trace.traceType.name()) {
              case 'ADD':
                if (this.isRelatedToPlatform(modelElement)) {
                  meta = modelElement.typeDefinition.select('deployUnits[]/filters[name=platform,value=js]');
                  if (meta.size() > 0) {
                    du = meta.get(0).eContainer();
                    if (!this.modelObjMapper.getObject(du.path())) {
                      cmds.push(this.createCommand(AddDeployUnit, du));
                    }
                  } else {
                    var err = new Error('no DeployUnit found for \'' + modelElement.name + ': ' + modelElement.typeDefinition.name + '/' + modelElement.typeDefinition.version + '\' that matches the \'js\' platform');
                    err.className = this.toString();
                    throw err;
                  }

                  if (!this.modelObjMapper.getObject(modelElement.path())) {
                    cmds.push(this.createCommand(AddInstance, modelElement));
                  }
                }
                break;

              case 'REMOVE':
                currentModel = this.node.getKevoreeCore().getCurrentModel(); // old model
                var instFromCurrModel = currentModel.findByPath(trace.objPath); // instance from current model
                var instFromTargModel = this.targetModel.findByPath(trace.objPath); // instance in target model
                if ((instFromTargModel && !this.isRelatedToPlatform(instFromTargModel)) || !instFromTargModel) {
                  // instance is no longer related to platform or present in new model: stop & remove
                  if (this.modelObjMapper.getObject(instFromCurrModel.path())) {
                    if (instFromCurrModel.started) {
                      cmds.push(this.createCommand(StopInstance, instFromCurrModel));
                    }
                    if (this.modelObjMapper.getObject(trace.objPath)) {
                      cmds.push(this.createCommand(RemoveInstance, instFromCurrModel));
                    }
                  }
                }

                break;
            }
            break;

          case 'deployUnits':
            // switch (trace.traceType.name()) {
            //   case 'ADD':
            //     if (this.targetModel.findByPath(trace.srcPath).eContainer().metaClassName() === 'org.kevoree.Package') {
            //       console.log('add hash=' + modelElement.hashcode, 'name=' + modelElement.name, 'version=' + modelElement.version);
            //     }
            //     // if (this.isRelatedToPlatform(modelElement)) {
            //     //   cmds.push(this.createCommand(AddDeployUnit, modelElement));
            //     // }
            //     break;
            //
            //   case 'REMOVE':
            //     currentModel = this.node.getKevoreeCore().getCurrentModel();
            //     du = currentModel.findByPath(trace.objPath);
            //     if (du.eContainer().metaClassName() === 'org.kevore.Package') {
            //       console.log('remove hash=' + modelElement.hashcode, 'name=' + modelElement.name, 'version=' + modelElement.version);
            //     }
            //     // if (du) {
            //     //   cmds.push(this.createCommand(RemoveDeployUnit, du));
            //     // }
            //     break;
            // }
            break;

          case 'bindings':
            switch (trace.traceType.name()) {
              case 'ADD':
                if (this.isRelatedToPlatform(modelElement)) {
                  if (!this.isVirtual(modelElement)) {
                    cmds.push(this.createCommand(AddBinding, modelElement));

                    if (modelElement.hub && this.isRelatedToPlatform(modelElement.hub)) {
                      if (!this.modelObjMapper.getObject(modelElement.hub.path())) {
                        meta = modelElement.hub.typeDefinition.select('deployUnits[]/filters[name=platform,value=js]');
                        if (meta.size() > 0) {
                          du = meta.get(0).eContainer();
                          if (!this.modelObjMapper.getObject(du.path())) {
                            cmds.push(this.createCommand(AddDeployUnit, du));
                          }
                        } else {
                          var e = new Error('no DeployUnit found for \'' + modelElement.hub.name + ': ' + modelElement.hub.typeDefinition.name + '/' + modelElement.hub.typeDefinition.version + '\' that matches the \'js\' platform');
                          e.className = this.toString();
                          throw e;
                        }

                        if (modelElement.hub.dictionary) {
                          cmds = cmds.concat(this.createUpdateDictionaryCommands(modelElement.hub.dictionary));
                        }

                        var fragDics = modelElement.hub.fragmentDictionary.iterator();
                        while (fragDics.hasNext()) {
                          var fragDic = fragDics.next();
                          if (fragDic.name === this.node.getName()) {
                            cmds = cmds.concat(this.createUpdateDictionaryCommands(fragDic));
                          }
                        }

                        cmds.push(this.createCommand(AddInstance, modelElement.hub));
                        if (modelElement.hub.started) {
                          cmds.push(this.createCommand(StartInstance, modelElement.hub));
                        }
                      }
                    }
                  }
                }
                break;

              case 'REMOVE':
                currentModel = this.node.getKevoreeCore().getCurrentModel(); // old model
                var binding = currentModel.findByPath(trace.objPath); // binding before removal trace
                if (binding) {
                  var newChan = this.targetModel.findByPath(binding.hub.path());
                  var chanStillUsed = false;
                  if (newChan) {
                    var bindings = newChan.bindings.iterator();
                    while (bindings.hasNext()) {
                      if (this.isRelatedToPlatform(bindings.next())) {
                        // there is still a binding between this chan and this platform => cant remove
                        chanStillUsed = true;
                        break;
                      }
                    }
                  }

                  if (!chanStillUsed && this.modelObjMapper.getObject(binding.hub.path())) {
                    if (this.modelObjMapper.getObject(binding.hub.path())) {
                      cmds.push(this.createCommand(RemoveInstance, binding.hub));
                    }

                    if (binding.hub.started) {
                      cmds.push(this.createCommand(StopInstance, binding.hub));
                    }
                  }
                }

                if (this.isRelatedToPlatform(binding)) {
                  cmds.push(this.createCommand(RemoveBinding, binding));
                }
                break;
            }
            break;

          case 'started':
            if (trace.traceType.name() === 'SET' && Kotlin.isType(modelElement, kevoree.Instance)) {
              if (this.isRelatedToPlatform(modelElement)) {
                if (Kotlin.isType(modelElement, kevoree.ContainerNode) && modelElement.name === this.node.getName()) {
                  if (trace.content === 'true') {
                    // start this node platform
                    cmds.push(this.createCommand(StartInstance, modelElement));
                  } else {
                    // stop this node platform
                    cmds.push(this.createCommand(HaraKiri, modelElement));
                  }
                } else {
                  if (trace.content === 'true') {
                    cmds.push(this.createCommand(StartInstance, modelElement));
                    if (!modelElement.host) {
                      if (modelElement.dictionary) {
                        var updateDicCmds = this.createUpdateDictionaryCommands(modelElement.dictionary);
                        if (updateDicCmds.length > 0) {
                          cmds = cmds.concat(updateDicCmds);
                          cmds.push(this.createCommand(UpdateInstance, modelElement));
                        }
                      }

                      var elemFragDics = modelElement.fragmentDictionary.iterator();
                      while (elemFragDics.hasNext()) {
                        var fDic = elemFragDics.next();
                        if (fDic.name === this.node.getName()) {
                          var updateFDicCmds = this.createUpdateDictionaryCommands(fDic);
                          if (updateFDicCmds.length > 0) {
                            cmds = cmds.concat(updateFDicCmds);
                            cmds.push(this.createCommand(UpdateInstance, modelElement));
                          }
                        }
                      }
                    }
                  } else {
                    if (modelElement.host && modelElement.host.name === this.node.getName()) {
                      // modelElement is an hosted node (so it does not have an instance in this platform)
                      cmds.push(this.createCommand(StopInstance, modelElement));

                    } else {
                      instance = this.modelObjMapper.getObject(modelElement.path());
                      if (instance && instance.isStarted()) {
                        cmds.push(this.createCommand(StopInstance, modelElement));
                      }
                    }
                  }
                }
              }
            }
            break;

          case 'value':
            if (trace.traceType.name() === 'SET' &&
              Kotlin.isType(modelElement, kevoree.Value) &&
              Kotlin.isType(modelElement.eContainer(), kevoree.Dictionary)) {
              if (this.isRelatedToPlatform(modelElement)) {
                instance = modelElement.eContainer().eContainer();
                if (instance.started && !instance.host) {
                  var updateDicAttrs = this.createUpdateDictionaryCommands(modelElement.eContainer());
                  if (updateDicAttrs.length > 0) {
                    cmds = cmds.concat(updateDicAttrs);
                    cmds.push(this.createCommand(UpdateInstance, modelElement.eContainer().eContainer()));
                  }
                }
              }
            }
            break;

          case 'typeDefinition':
            switch (trace.traceType.name()) {
              case 'ADD':
                currentModel = this.node.getKevoreeCore().getCurrentModel();
                currentModelElement = currentModel.findByPath(trace.srcPath);
                targetModelElement = this.targetModel.findByPath(trace.srcPath);
                if (this.isRelatedToPlatform(currentModelElement)) {
                  if (currentModelElement.path() === this.node.getPath()) {
                    // this adaptation means: to change this node platform TypeDefinition
                    // TODO this should be checked and handled in the core.. not here
                  } else {
                    meta = modelElement.select('deployUnits[]/filters[name=platform,value=js]');
                    if (meta.size() > 0) {
                      du = meta.get(0).eContainer();
                      if (!this.modelObjMapper.getObject(du.path())) {
                        cmds.push(this.createCommand(AddDeployUnit, du));
                      }

                      instance = this.modelObjMapper.getObject(currentModelElement.path());
                      if (instance) {
                        // instance found in the node map
                        if (instance.started) {
                          // stop instance
                          cmds.push(this.createCommand(StopInstance, currentModelElement));
                        }

                        if (Kotlin.isType(currentModelElement, kevoree.Channel)) {
                          // remove old bindings
                          currentModelElement.bindings.array.forEach(function (binding) {
                            cmds.push(this.createCommand(RemoveBinding, binding));
                          }.bind(this));
                          // add new bindings
                          targetModelElement.bindings.array.forEach(function (binding) {
                            cmds.push(this.createCommand(AddBinding, binding));
                          }.bind(this));

                        } else if (Kotlin.isType(currentModelElement, kevoree.ComponentInstance)) {
                          // remove old input port bindings
                          currentModelElement.provided.array.forEach(function (input) {
                            input.bindings.array.forEach(function (binding) {
                              cmds.push(this.createCommand(RemoveBinding, binding));
                            }.bind(this));
                          }.bind(this));
                          // remove old outout port bindings
                          currentModelElement.required.array.forEach(function (output) {
                            output.bindings.array.forEach(function (binding) {
                              cmds.push(this.createCommand(RemoveBinding, binding));
                            }.bind(this));
                          }.bind(this));

                          // add new input port bindings
                          targetModelElement.provided.array.forEach(function (input) {
                            input.bindings.array.forEach(function (binding) {
                              cmds.push(this.createCommand(AddBinding, binding));
                            }.bind(this));
                          }.bind(this));
                          // add new outout port bindings
                          targetModelElement.required.array.forEach(function (output) {
                            output.bindings.array.forEach(function (binding) {
                              cmds.push(this.createCommand(AddBinding, binding));
                            }.bind(this));
                          }.bind(this));
                        }

                        // TODO upgradeInstance ?

                        //reinject dictionary
                        this.createUpdateDictionaryCommands(targetModelElement.dictionary);

                        //restart
                        cmds.push(this.createCommand(StartInstance, targetModelElement));
                      } else {
                        // TODO hmm => what to do then ?
                      }
                    } else {
                      var error = new Error('no DeployUnit found for \'' + modelElement.name + ': ' + modelElement.typeDefinition.name + '/' + modelElement.typeDefinition.version + '\' that matches the \'js\' platform');
                      error.className = this.toString();
                      throw error;
                    }
                  }
                }
                break;

              case 'REMOVE':
                //console.log('>>>>> REMOVE TypeDef', modelElement.path());
                break;
            }

            break;
        }
      }
    }

    return cmds;
  },

  /**
   * know if an modelElement is related to the current plarform node
   * @param element
   * @returns {boolean}
   */
  isRelatedToPlatform: function (element) {
    if (Kotlin.isType(element, kevoree.ComponentInstance)) {
      // if parent is this node platform: it's ok
      return (element.eContainer().name === this.node.getName());

    } else if (Kotlin.isType(element, kevoree.Channel)) {
      // if this channel has bindings with components hosted in this node platform: it's ok
      var bindings = element.bindings.iterator();
      while (bindings.hasNext()) {
        var binding = bindings.next();
        if (binding.port && binding.port.eContainer()) {
          if (this.isRelatedToPlatform(binding.port.eContainer())) {
            return true;
          }
        }
      }

    } else if (Kotlin.isType(element, kevoree.Group)) {
      var subNodes = element.subNodes.iterator();
      while (subNodes.hasNext()) {
        if (subNodes.next().name === this.node.getName()) {
          return true;
        }
      }

    } else if (Kotlin.isType(element, kevoree.ContainerNode)) {
      return ((element.name === this.node.getName()) || (element.host && element.host.name === this.node.getName()));

    } else if (Kotlin.isType(element, kevoree.MBinding)) {
      if (element.port && element.port.eContainer()) {
        if (this.isRelatedToPlatform(element.port.eContainer())) {
          return true;
        }
      }
      if (element.hub) {
        return this.isRelatedToPlatform(element.hub);
      }

    } else if (Kotlin.isType(element, kevoree.Value)) {
      if (Kotlin.isType(element.eContainer(), kevoree.FragmentDictionary)) {
        return (element.eContainer().name === this.node.getName());
      } else {
        return this.isRelatedToPlatform(element.eContainer().eContainer());
      }

    } else if (Kotlin.isType(element, kevoree.Port)) {
      return this.isRelatedToPlatform(element.eContainer());
    }

    return false;
  },

  /**
   *
   * @param Cmd
   * @param element
   * @returns {Object}
   */
  createCommand: function (Cmd, element) {
    return new Cmd(this.node, this.modelObjMapper, this.targetModel, element);
  },

  /**
   *
   * @param kDic
   * @returns {Array}
   */
  createUpdateDictionaryCommands: function (kDic) {
    var cmds = [],
      dictionary = null;

    var entityInstance;
    if (kDic.eContainer().path() === this.node.getPath()) {
      entityInstance = this.node;
    } else {
      entityInstance = this.modelObjMapper.getObject(kDic.eContainer().path());
    }
    if (entityInstance) {
      dictionary = entityInstance.getDictionary();
    }
    var values = kDic.values.iterator();
    while (values.hasNext()) {
      var val = values.next();
      if (dictionary) {
        var oldVal = dictionary.getValue(val.name);
        if (oldVal !== val.value) {
          cmds.push(this.createCommand(UpdateDictionary, val));
        }
      } else {
        cmds.push(this.createCommand(UpdateDictionary, val));
      }
    }

    return cmds;
  },

  /**
   * @param elem Instance | TypeDefinition | MBinding
   * @returns true if the given element has a virtual TypeDefinition
   */
  isVirtual: function (elem) {
    if (Kotlin.isType(elem, kevoree.Instance)) {
      return this.isVirtual(elem.typeDefinition);
    } else if (Kotlin.isType(elem, kevoree.TypeDefinition)) {
      var virtual = elem.findMetaDataByID('virtual');
      return virtual !== null;
    } else if (Kotlin.isType(elem, kevoree.MBinding)) {
      if (elem.hub) {
        if (this.isVirtual(elem.hub.typeDefinition)) {
          return true;
        }
      }
      if (elem.port) {
        return this.isVirtual(elem.port.eContainer());
      }

    }
    return false;
  },

  /**
   * Sorts primitives array according to COMMAND_RANK
   * @param list
   * @returns {*}
   */
  sortCommands: function (list) {
    list.sort(function (a, b) {
      if (COMMAND_RANK[a.toString()] > COMMAND_RANK[b.toString()]) {
        return 1;
      } else if (COMMAND_RANK[a.toString()] < COMMAND_RANK[b.toString()]) {
        return -1;
      } else {
        return 0;
      }
    });

    return list;
  },

  setLogger: function (logger) {
    this.log = logger;
  }
};

module.exports = AdaptationEngine;
