'use strict';

const RootState = require('../');
const parent = new RootState({useChangeLog: true});
const child = new RootState();

child.addStateModifier('name', 'NAME_CHANGE', (oldBranch, payload) => {
  return payload;
});


// Here we add the child as a branch of the parent, at the provided path.
parent.addAsBranch('sweet.child.of.mine', child);


// This is an example of how we can listen to events from the parent which were
// propagated up from the child.
parent.on('NAME_CHANGE', (payload) => {
  console.log('Parent is alerted to NAME_CHANGE:', payload, '\n');
});


// We'll dispatch the first namechange.
child.dispatch('NAME_CHANGE', 'Bill');


console.log('Child State:', JSON.stringify(child.getState(), null, 2), '\n');
console.log('Parent State:', JSON.stringify(parent.getState(), null, 2));
console.log('Parent ChangeLog:', JSON.stringify(parent.getChangeLog(), null, 2), '\n\n');



// We'll dispatch it a second time.
child.dispatch('NAME_CHANGE', 'Tomas');


console.log('Child State:', JSON.stringify(child.getState(), null, 2));
console.log('Parent State:', JSON.stringify(parent.getState(), null, 2));
console.log('Parent ChangeLog:', JSON.stringify(parent.getChangeLog(), null, 2));



// Here we'll demonstrate proper error handling:

const secondChild = new RootState();

// Inability to add at path being used by another child.
try {
  parent.addAsBranch('sweet.child.of.mine', secondChild);
}
catch(err) {
  console.log(err);
}


// Inability to add at path which is deeper than another child
try {
  parent.addAsBranch('sweet.child.of.mine.deep', secondChild);
}
catch(err) {
  console.log(err);
}

