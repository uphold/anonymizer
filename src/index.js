'use strict';

/**
 * Module dependencies.
 */

const get = require('lodash.get');
const stringify = require('json-stringify-safe');
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
  const whitelistPaths = new RegExp(`^(${whitelistTerms.replace(/\./g, '\\.').replace(/\*/g, '.*')})$`, 'i');
  const blacklistTerms = blacklist.join('|');
  const blacklistPaths = new RegExp(`^(${blacklistTerms.replace(/\./g, '\\.').replace(/\*/g, '.*')})$`, 'i');

  return values => {
    const obj = JSON.parse(stringify(values));

    traverse(obj).forEach(function() {
      const path = this.path.join('.');
      const isBuffer = Buffer.isBuffer(get(values, path));

      if (!isBuffer && !this.isLeaf) {
        return;
      }

      if (isBuffer && (!blacklistPaths.test(path) && whitelistPaths.test(path))) {
        return this.update(Buffer.from(this.node), true);
      }

      const replacedValue = replacement(this.key, this.node, this.path);

      if (blacklistPaths.test(path) || !whitelistPaths.test(path)) {
        this.update(replacedValue);
      }
    });

    return obj;
  };
};
