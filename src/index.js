'use strict';

/**
 * Module dependencies.
 */

const set = require('lodash.set');
const traverse = require('traverse');

/**
 * Constants.
 */

const DEFAULT_REPLACEMENT = '--REDACTED--';

/**
 * Module exports.
 */

module.exports = ({ blacklist = [], whitelist = [] } = {}, { replacement = false, trim = false } = {}) => {
  const whitelistTerms = whitelist.join('|');
  const whitelistPaths = new RegExp(`^(?:${whitelistTerms.replace(/\./g, '\\.').replace(/\*/g, '.*')})$`, 'i');
  const blacklistTerms = blacklist.join('|');
  const blacklistPaths = new RegExp(`^(?:${blacklistTerms.replace(/\./g, '\\.').replace(/\*/g, '.*')})$`, 'i');

  return values => {
    if (!(values instanceof Object)) {
      return values;
    }

    const blacklistedKeys = [];
    const obj = {};

    function traverser(subpath) {
      function anonymize(path, key, node) {
        if (blacklistPaths.test(path) || !whitelistPaths.test(path)) {
          const replacedValue = replacement ? replacement(key, node, path) : DEFAULT_REPLACEMENT;

          if (trim && replacedValue === DEFAULT_REPLACEMENT) {
            blacklistedKeys.push(path);
          } else {
            set(obj, path, replacedValue);
          }
        } else {
          set(obj, path, node);
        }
      }

      return function() {
        const path = subpath ? `${subpath}.${this.path.join('.')}` : this.path.join('.');

        if (this.isLeaf) {
          if (this.node.toJSON) {
            traverse(this.node.toJSON()).forEach(traverser(path));

            return this.block();
          }

          anonymize(path, this.key, this.node);
        } else if (Buffer.isBuffer(this.node)) {
          anonymize(path, this.key, Buffer.from(this.node));
          this.block();
        } else if (this.circular) {
          set(obj, path, '[Circular ~]');
          this.block();
        }
      };
    }

    traverse(values).forEach(traverser());

    if (blacklistedKeys.length) {
      // eslint-disable-next-line no-underscore-dangle
      obj.__redacted__ = blacklistedKeys;
    }

    return obj;
  };
};
