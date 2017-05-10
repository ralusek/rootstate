'use strict';

const Immutable = require('seamless-immutable');

/**
 * Check if argument is undefined or null.
 * @param {*}
 * @return boolean
 */
function _isNil(test) {
  return (test === undefined) || (test === null);
}


/**
 * Get the value at the provided path of an obj.
 * @param {object} obj Target obj to search.
 * @param {string} path Period delimted path to check.
 * @param {*} _default The default value to return if not found.
 * @return {*}
 */
module.exports._get = function(obj, path, _default) {
  if (!obj) return _default;
  if (obj[path]) return obj[path];

  let current = obj;
  path = path.split(/\.+/);
  for (let i in path) {
    if (_isNil(current = current[path[i]])) return _default;
  }

  return current;
};



// /**
//  * Mutably Set the value at the provided path.
//  */
// module.exports._set = function(obj, path, value) {
//   obj = _isNil(obj) ? {} : obj;

//   let current = obj;
//   path = path.split(/\.+/);
//   const last = path.length - 1;
//   for (let i = 0; i < last; i++) {
//     current = current[path[i]] = (current[path[i]] || {});
//   }

//   return current[path[last]] = value;
// };


/**
 * Iterate over the values in an obj.
 */
module.exports._forOwn = function(obj, fn) {
  Object.keys(obj).forEach(key => fn(obj[key], key, obj));
};
