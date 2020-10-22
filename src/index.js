'use strict';

/**
 * Module dependencies.
 */

const clone = require('clone');
const traverse = require('traverse');

/**
 * Constants.
 */

const DEFAULT_REPLACEMENT = '--REDACTED--';

/**
 * Module exports.
 */

module.exports = ({ blacklist = [], whitelist = [] } = {}, { replacement = () => DEFAULT_REPLACEMENT } = {}) => {
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

      const replacedValue = replacement(this.key, this.node, this.path);

      if (blacklistPaths.test(path) || !whitelistPaths.test(path)) {
        this.update(replacedValue);
      }
    });

    return obj;
  };
};
