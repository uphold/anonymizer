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

module.exports = (
  { blacklist = [], whitelist = [] } = {},
  { replacement = () => DEFAULT_REPLACEMENT, trim = false } = {}
) => {
  const whitelistTerms = whitelist.join('|');
  const whitelistPaths = new RegExp(`^(${whitelistTerms.replace(/\./g, '\\.').replace(/\*/g, '.*')})$`, 'i');
  const blacklistTerms = blacklist.join('|');
  const blacklistPaths = new RegExp(`^(${blacklistTerms.replace(/\./g, '\\.').replace(/\*/g, '.*')})$`, 'i');

  return values => {
    if (!(values instanceof Object)) {
      return values;
    }

    const blacklistedKeys = [];
    const obj = JSON.parse(stringify(values));

    traverse(obj).forEach(function() {
      const path = this.path.join('.');
      const isBuffer = Buffer.isBuffer(get(values, path));

      if (trim) {
        this.after(function(node) {
          if (!this.isLeaf && Object.values(node).every(value => value === undefined)) {
            return this.isRoot ? this.update(undefined, true) : this.delete();
          }
        });
      }

      if (!isBuffer && !this.isLeaf) {
        return;
      }

      if (isBuffer && (!blacklistPaths.test(path) && whitelistPaths.test(path))) {
        return this.update(Buffer.from(this.node), true);
      }

      if (trim) {
        if (blacklistPaths.test(path) || !whitelistPaths.test(path)) {
          blacklistedKeys.push(this.path.join('.'));

          return this.isRoot ? this.update(undefined, true) : this.delete();
        }
      }

      const replacedValue = replacement(this.key, this.node, this.path);

      if (blacklistPaths.test(path) || !whitelistPaths.test(path)) {
        this.update(replacedValue);
      }
    });

    if (blacklistedKeys.length) {
      // eslint-disable-next-line no-underscore-dangle
      obj.__redacted__ = blacklistedKeys;
    }

    return obj;
  };
};
