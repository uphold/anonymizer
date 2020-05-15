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

module.exports = ({ blacklist = [], whitelist = [] } = {}) => {
  const whitelistTerms = whitelist.join('|');
  const whitelistPaths = new RegExp(`^(${whitelistTerms.replace('.', '\\.').replace(/\*/g, '.*')})$`, 'i');
  const blacklistTerms = blacklist.join('|');
  const blacklistPaths = new RegExp(`^(${blacklistTerms.replace('.', '\\.').replace(/\*/g, '.*')})$`, 'i');

  return values => {
    const obj = clone(values);

    traverse(obj).forEach(function() {
      if (this.circular) {
        return '[Circular ~]';
      }

      const path = this.path.join('.');
      const isBuffer = this.node instanceof Buffer;

      if (!isBuffer && !this.isLeaf) {
        return;
      }

      if (isBuffer && (!blacklistPaths.test(path) && whitelistPaths.test(path))) {
        return this.update(this.node, true);
      }

      if (blacklistPaths.test(path) || !whitelistPaths.test(path)) {
        this.update(replacement);
      }
    });

    return obj;
  };
};
