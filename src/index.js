'use strict';

/**
 * Module dependencies.
 */

const stringify = require('json-stringify-safe');
const traverse = require('traverse');

/**
 * Constants.
 */

const replacement = '--REDACTED--';

/**
 * Module exports.
 */

module.exports = (whitelist = []) => {
  const terms = whitelist.join('|');
  const paths = new RegExp(`^(${terms.replace('.', '\\.').replace(/\*/g, '.*')})$`, 'i');

  return values => {
    const clone = JSON.parse(stringify(values));

    traverse(clone).forEach(function() {
      if (!this.isLeaf) {
        return;
      }

      if (!paths.test(this.path.join('.'))) {
        this.update(replacement);
      }
    });

    return clone;
  };
};
