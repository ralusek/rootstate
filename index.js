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

    // This serves as the basis for any path. Used for creating views into
    // specific parts of the data.
    if (config.basis) p(this).basis = config.basis;

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

    const stateModifiers = p(this).stateModifiers[eventName] = (p(this).stateModifiers[eventName] || {});
    if (stateModifiers[path]) throw new Error(`Cannot register two State Modifiers for the same eventName and path: ${eventName}: ${path}`);
    stateModifiers[path] = fn;

    p(this).stateModifierPathMap.set(fn, path);
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
}




// Add Built-in Event names as constant.
Object.defineProperty(RootState, 'EVENT', {value: EVENT});

// Add convenience reference to Immutable Library.
Object.defineProperty(RootState, 'immutable', {value: Immutable});


module.exports = RootState;
