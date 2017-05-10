'use strict';

const Immutable = require('seamless-immutable');
const utils = require('./utils');


// Built in events with default behavior.
const EVENT = Object.freeze({
  DISPATCH: 'dispatch'
});



// This establishes a private namespace.
const namespace = new WeakMap();
function p(object) {
  if (!namespace.has(object)) namespace.set(object, {});
  return namespace.get(object);
}



/**
 *
 */
class RootState {
  constructor(config) {
    config = config || {};
    p(this).useChangeLog = config.useChangeLog === true;

    // Allow path to be provided to serve as default path for stateModifiers.
    if (config.path) p(this).path = config.path;



    // This is the actual state data.
    p(this).state = Immutable({});
    
    // This is a map keyed by event names, referencing sets of listeners.
    p(this).handlers = {};

    // These are handlers which are explicitly meant to alter part of the state.
    p(this).stateModifiers = {};

    // This is the changelog of all events which have altered the state.
    p(this).changeLog = [];


    // Cleanup weakmap to allow usage of `off` in removing normal `on` event
    // handlers, as well as stateModifiers.
    p(this).stateModifierPathMap = new WeakMap();


    // This is a flag to allow the call of a Meta Dispatch event, i.e. a
    // dispatch that an EVENT.DISPATCH occurred.
    p(this).canMetaDispatch = false;

    // Here we keep a tree structure of paths being used by modifiers and child
    // branches in order to check for conflicts when registering new of either.
    p(this).conflictTree = Object.freeze({
      modifiers: {},
      branches: {}
    });
  }
  

  /**
   *
   */
  dispatch(eventName, payload) {
    const isMetaDispatch = eventName === EVENT.DISPATCH;
    if (isMetaDispatch) {
      if (!p(this).canMetaDispatch) throw new Error('Cannot manually invoke a dispatch for the "dispatch" event.');
      else p(this).canMetaDispatch = false;
    }

    const handlers = p(this).handlers[eventName];
    const stateModifiers = p(this).stateModifiers[eventName];

    const changes = [];

    let newState = p(this).state;
    // Handle State Modifiers first.
    if (stateModifiers) {
      utils._forOwn(stateModifiers, (stateModifier, path) => {
        // Get the previous state at this path.
        const oldBranch = utils._get(p(this).state, path);
        // Calculate the next state at this path. Changes passed in, but will
        // only include changes so far.
        const newBranch = Immutable(stateModifier(oldBranch, payload, changes.slice()));
        const splitPath = path.split(/\.+/);
        if (oldBranch !== newBranch) {
          newState = Immutable.setIn(newState, splitPath, newBranch);
          const change = Object.freeze({path, new: newBranch});
          changes.push(change);
          p(this).useChangeLog && p(this).changeLog.push(change);
        }
      });
      p(this).state = newState;
    }
    
    // Handle normal events.
    if (handlers) {
      handlers.forEach(handler => handler(payload, changes.slice()));
    }

    // Handle meta dispatch call if not already in one.
    if (!isMetaDispatch) {
      p(this).canMetaDispatch = true;
      this.dispatch(EVENT.DISPATCH, {eventName, payload, changes: changes.slice()});
    }
  }


  /**
   *
   */
  on(eventName, fn) {
    p(this).handlers[eventName] = p(this).handlers[eventName] || new Set();
    p(this).handlers[eventName].add(fn);
  }


  /**
   *
   */
  off(eventName, fn) {
    const handlers = p(this).handlers[eventName];
    if (handlers) {
      handlers.delete(fn);
      if (!fn || !handlers.size) delete p(this).handlers[eventName];
    }

    const stateModifiers = p(this).stateModifiers[eventName];
    if (stateModifiers) {
      if (fn) {
        const pathMap = p(this).stateModifierPathMap.get(fn);
        if (pathMap) delete p(this).stateModifiers[pathMap];
      }
      else delete p(this).stateModifiers[eventName];
    }
  }
  

  /**
   *
   */
  addStateModifier(path, eventName, fn) {
    path = path || p(this).path;
    if (!path) throw new Error('RootState cannot addStateModifier without a provided path.');

    // TODO replace this with more flexible read-time conflict checking.
    const higherTierBranchLeaf = findConflictingLeaf(p(this).conflictTree.branches, path.split(/\.+/));
    if (higherTierBranchLeaf) throw new Error(`RootState cannot addAsBrach, cannot add a branch at or beneath an existing branched RootState. Conflict at: ${higherTierBranchLeaf.path.join('.')}`);

    const stateModifiers = p(this).stateModifiers[eventName] = (p(this).stateModifiers[eventName] || {});
    if (stateModifiers[path]) throw new Error(`Cannot register two State Modifiers for the same eventName and path: ${eventName}: ${path}`);
    stateModifiers[path] = fn;

    p(this).stateModifierPathMap.set(fn, path);

    // Register path as reserved. (For conflict aversion with child branch states).
    utils._set(p(this).conflictTree.modifiers, path, {leaf: true});
  }


  /**
   *
   */
  getState(path) {
    return path ? utils._get(p(this).state, path) : p(this).state;
  }


  /**
   *
   */
  getChangeLog() {
    return p(this).changeLog.slice();
  }


  /**
   *
   */
  addAsBranch(path, rootState) {
    const splitPath = path.split(/\.+/);

    // TODO replace this with more flexible read-time conflict checking.
    const higherTierBranchLeaf = findConflictingLeaf(p(this).conflictTree.branches, splitPath);
    if (higherTierBranchLeaf) throw new Error(`RootState cannot addAsBrach, cannot add a branch at or beneath an existing branched RootState. Conflict at: ${higherTierBranchLeaf.path.join('.')}`);
    const higherTierModifierLeaf = findConflictingLeaf(p(this).conflictTree.modifiers, splitPath);
    if (higherTierModifierLeaf) throw new Error(`RootState cannot addAsBranch, cannot add a branch at or beneath an existing path affected by a modifier. Conflict at: ${higherTierModifierLeaf.path.join('.')}`)

    // Register path as reserved.
    utils._set(p(this).conflictTree.branches, path, {leaf: true});

    rootState.on(RootState.EVENT.DISPATCH, (meta) => {
      // Transfer child state to parent state.
      p(this).state = Immutable.setIn(p(this).state, splitPath, rootState.getState());

      // Transfer child logs if applicable.
      if (p(this).useChangeLog) {
        meta.changes.forEach(change => {
          p(this).changeLog.push(Immutable(Object.assign({}, change, {fromBranch: path})));
        });
      }
      // Propagate event upwards.
      this.dispatch(meta.eventName, meta.payload);
    });
  }
}

function findConflictingLeaf(tree, splitPath) {
  for (let i = splitPath.length; i > 1; i--) {
    const path = splitPath.slice(0, i);
    const test = Immutable.getIn(tree, path);
    if (test && test.leaf) return {path};
  }
  return false;
}


// Add Built-in Event names as constant.
Object.defineProperty(RootState, 'EVENT', {value: EVENT});

// Add convenience reference to Immutable Library.
Object.defineProperty(RootState, 'immutable', {value: Immutable});


module.exports = RootState;
