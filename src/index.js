'use strict';

/**
 * Module dependencies.
 */

const { serializeError } = require('serialize-error');
const get = require('lodash.get');
const set = require('lodash.set');
const stringify = require('json-stringify-safe');
const traverse = require('traverse');

/**
 * Constants.
 */

const DEFAULT_REPLACEMENT = '--REDACTED--';

/**
 * Validate serializers.
 */

function validateSerializers(serializers) {
  serializers.forEach(({ path, serializer }) => {
    if (typeof serializer !== 'function') {
      throw new TypeError(`Invalid serializer for \`${path}\` path: must be a function`);
    }
  });
}

/**
 * `parseAndSerialize` builds a copy of the original object, computes the serializer's results and mutates the
 * copy with the serialized values. To perform the copy, we are using JSON.parse(stringify(values)), which does
 * not construct an exact replication of the initial input, but it can't be swapped for another solution due to
 * its performance and because it can also handle classes correctly. While most of the existing deep clones, when
 * cloning Classes receive a `Class` as input and return a `Class` as output, `stringify` does things differently.
 * When it receives a `Class`, it calls the method `toJSON` and returns its output or if the `Class` doesn't have
 * `toJSON` it returns an empty object. This is very powerful since `traverse` can't iterate over over `Classes`.
 * During `parseAndSerialize` execution, we perform additional copies to avoid having a serializer updating the
 * original object by reference. These copies are only done in the values passed to serializers to avoid two full
 * copies of the original values. For this, we used `structureClone` which is able to copy a wide range of objects
 * such as native errors.
 */

function parseAndSerialize(values, serializers) {
  const target = JSON.parse(stringify(values));

  for (const { path, serializer } of serializers) {
    const value = get(values, path);

    if (value === undefined) {
      continue;
    }

    const clone = global.structuredClone(value);

    try {
      set(target, path, serializer(clone));
    } catch (error) {
      set(target, path, `Anonymize ERROR: Error while applying ${path} serializer`);
    }
  }

  return target;
}

/**
 * Module exports `anonymizer` function.
 */

module.exports.anonymizer = (
  { blacklist = [], whitelist = [] } = {},
  { replacement = () => DEFAULT_REPLACEMENT, serializers = [], trim = false } = {}
) => {
  const whitelistTerms = whitelist.join('|');
  const whitelistPaths = new RegExp(`^(${whitelistTerms.replace(/\./g, '\\.').replace(/\*/g, '.*')})$`, 'i');
  const blacklistTerms = blacklist.join('|');
  const blacklistPaths = new RegExp(`^(${blacklistTerms.replace(/\./g, '\\.').replace(/\*/g, '.*')})$`, 'i');

  validateSerializers(serializers);

  return values => {
    if (!(values instanceof Object)) {
      return values;
    }

    const blacklistedKeys = new Set();
    const obj = parseAndSerialize(values, serializers);

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

      if (isBuffer && !blacklistPaths.test(path) && whitelistPaths.test(path)) {
        return this.update(Buffer.from(this.node), true);
      }

      const replacedValue = replacement(this.key, this.node, this.path);

      if (blacklistPaths.test(path) || !whitelistPaths.test(path)) {
        if (trim && replacedValue === DEFAULT_REPLACEMENT) {
          const path = this.path.map(value => (isNaN(value) ? value : '[]'));

          blacklistedKeys.add(path.join('.'));

          return this.isRoot ? this.update(undefined, true) : this.delete();
        }

        this.update(replacedValue);
      }
    });

    if (blacklistedKeys.size) {
      // eslint-disable-next-line no-underscore-dangle
      obj.__redacted__ = Array.from(blacklistedKeys);
    }

    return obj;
  };
};

/**
 * Module exports `defaultSerializers`.
 */

module.exports.defaultSerializers = {
  error: serializeError
};
