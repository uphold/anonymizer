'use strict';

/**
 * Module dependencies.
 */

const clone = require('clone');
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
    const obj = clone(values);

    traverse(obj).forEach(function() {
      if (this.circular) {
        return '[Circular ~]';
      }

      const isBuffer = this.node instanceof Buffer;

      if (!isBuffer && !this.isLeaf) {
        return;
      }

      if (isBuffer && paths.test(this.path.join('.'))) {
        return this.update(this.node, true);
      }

      if (!paths.test(this.path.join('.'))) {
        this.update(replacement);
      }
    });

    return obj;
  };
};
