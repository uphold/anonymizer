'use strict';

/**
 * Module dependencies.
 */

const isArray = require('lodash.isarray');
const isBuffer = require('lodash.isbuffer');
const isDate = require('lodash.isdate');
const isObject = require('lodash.isobject');
const isRegExp = require('lodash.isregexp');

/**
 * Constants.
 */

const DEFAULT_REPLACEMENT = '--REDACTED--';

/**
 * Check if value is a leaf.
 */

const isLeaf = value => !isObject(value) || isDate(value) || isRegExp(value) || isBuffer(value);

/**
 * Append key to path.
 */

const appendToPath = (path, key) => {
  return path !== null ? `${path}.${key}` : `${key}`;
};

/**
 * Traverse.
 */

function traverse(element, transformer = value => value) {
  function walk(value, key, path) {
    if (isLeaf(value)) {
      return transformer(value, key.toString(), path);
    }

    if (value.toJSON) {
      value = value.toJSON();
    }

    if (isArray(value)) {
      return value.map((value, key) => walk(value, key, appendToPath(path, key)));
    }

    const result = {};

    for (const property in value) {
      result[property] = walk(value[property], property, appendToPath(path, property));
    }

    return result;
  }

  return walk(element, null, null);
}

/**
 * Module exports.
 */

module.exports = ({ blacklist = [], whitelist = [] } = {}, { replacement = () => DEFAULT_REPLACEMENT } = {}) => {
  const blacklistTerms = blacklist.join('|');
  const blacklistPaths = new RegExp(`^(${blacklistTerms.replace(/\./g, '\\.').replace(/\*/g, '.*')})$`, 'i');
  const whitelistTerms = whitelist.join('|');
  const whitelistPaths = new RegExp(`^(${whitelistTerms.replace(/\./g, '\\.').replace(/\*/g, '.*')})$`, 'i');

  return values => {
    return traverse(values, (node, key, path) => {
      if (!whitelistPaths.test(path) || blacklistPaths.test(path)) {
        return replacement(key, node, path);
      }

      return node;
    });
  };
};
