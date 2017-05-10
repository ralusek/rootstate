'use strict';

const RootState = require('../');
const rootState = new RootState({useChangeLog: true});

// This is an example of me doing a reducer (i.e. "event handlers")
rootState.addStateModifier('data.users', 'USER_CREATED', (oldBranch, payload) => {
  return (oldBranch || []).concat([payload]);
});


// This is an example of a dispatch.
rootState.dispatch('USER_CREATED', {name: 'Tomas', lastName: 'Savigliano'});
rootState.dispatch('USER_CREATED', {name: 'Matt', lastName: 'Hoenecke'});
rootState.dispatch('USER_CREATED', {name: 'Sam', lastName: 'Neuendorf'});


console.log(JSON.stringify(rootState.getState(), null, 2));
console.log(JSON.stringify(rootState.getChangeLog(), null, 2));
