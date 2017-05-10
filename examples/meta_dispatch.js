'use strict';

const RootState = require('../');
const rootState = new RootState();

rootState.on(RootState.EVENT.DISPATCH, (result) => {
  console.log('Meta Dispatch:', result, '\n');
});

rootState.on('THING_HAPPENED', (result) => {
  console.log('Thing Happened:', result);
});

rootState.on('OTHER_THING_HAPPENED', (result) => {
  console.log('Other Thing Happened:', result);
});


// This is an example of a dispatch.
rootState.dispatch('THING_HAPPENED', {name: 'Michael'});
rootState.dispatch('THING_HAPPENED', {name: 'Pichael'});
rootState.dispatch('THING_HAPPENED', {name: 'Stealy'});
rootState.dispatch('OTHER_THING_HAPPENED', {name: 'Tiny Rick'});
