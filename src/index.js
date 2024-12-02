'use strict';

/**
 * Module dependencies.
 */

const { cloneDeep, cloneDeepWith, get, set } = require('lodash');
const { serializeError } = require('serialize-error');
const stringify = require('json-stringify-safe');
const traverse = require('traverse');

/**
 * Constants.
 */

const DEFAULT_REPLACEMENT = '--REDACTED--';

/**
 * Gets a list with all properties of an object.
 */

function getAllPropertyNames(obj, maxChainLength = 10) {
  const set = new Set();
  let i = 0;

  while (obj.constructor !== Object && i < maxChainLength) {
    Object.getOwnPropertyNames(obj).forEach(name => set.add(name));
    obj = Object.getPrototypeOf(obj);
    i++;
  }

  return [...set];
}

/**
 * Custom error clone.
 */

function customErrorClone(error) {
  const clone = {};

  getAllPropertyNames(error).forEach(key => {
    const isConstructor = key === 'constructor';
    const isFunction = typeof error[key] === 'function';

    if (!isConstructor && !isFunction) {
      clone[key] = cloneDeep(error[key]);
    }
  });

  return clone;
}

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
 * `toJSON` it returns an empty object. This is very powerful since `traverse` can't iterate over `Classes`.
 * During `parseAndSerialize` execution, we perform additional copies to avoid having a serializer updating the
 * original object by reference. These copies are only done in the values passed to serializers to avoid two full
 * copies of the original values. For this, we used `cloneDeepWith` with a custom clone only for errors. When an
 * error is found, we compute a list with all properties (properties from the class itself and from extended classes).
 * Then we use these properties to get the original values and copying them into a new object.
 */

function parseAndSerialize(values, serializers) {
  const target = JSON.parse(stringify(values));

  for (const { path, serializer } of serializers) {
    const value = get(values, path);

    if (value === undefined) {
      continue;
    }

    try {
      const copy = cloneDeepWith(value, node => {
        if (node instanceof Error) {
          return customErrorClone(node);
        }

        return undefined;
      });

      set(target, path, serializer(copy));
    } catch (error) {
      set(target, path, 'Anonymize ERROR: Error while applying serializer');
    }
  }

  return target;
}

/**
 * Creates a path tester function used to check if a path matches a list of patterns.
 *
 * This function was built with optimization in mind.
 * It separates the patterns into two lists, regular patterns and wildcard pattern, and applies the following strategy:
 *
 * 1. It tries to find an exact match in the regular patterns first, which is faster.
 * 2. If no match is found, it uses a regular expression to test the wildcard patterns.
 */

const createPathTester = patterns => {
  const regularPatterns = patterns.filter(pattern => !pattern.includes('*')).map(pattern => pattern.toLowerCase());
  const wildcardPatterns = patterns.filter(pattern => pattern.includes('*')).map(pattern => pattern.toLowerCase());

  const regularPatternsSet = new Set(regularPatterns);
  const wildcardRegExp = new RegExp(`^(${wildcardPatterns.join('|').replace(/\./g, '\\.').replace(/\*/g, '.*')})$`);

  return path => {
    const lowercasedPath = path.toLowerCase();

    return regularPatternsSet.has(lowercasedPath) || wildcardRegExp.test(lowercasedPath);
  };
};

/**
 * Module exports `anonymizer` function.
 */

module.exports.anonymizer = (
  { blacklist = [], whitelist = [] } = {},
  { replacement = () => DEFAULT_REPLACEMENT, serializers = [], trim = false } = {}
) => {
  validateSerializers(serializers);

  const isWhitelisted = createPathTester(whitelist);
  const isBlacklisted = createPathTester(blacklist);

  return values => {
    if (!(values instanceof Object)) {
      return values;
    }

    const blacklistedKeys = new Set();
    const obj = parseAndSerialize(values, serializers);

    traverse(obj).forEach(function () {
      if (this.isRoot) {
        return;
      }

      if (trim) {
        this.after(function (node) {
          if (!this.isLeaf && Object.values(node).every(value => value === undefined)) {
            return this.delete();
          }
        });
      }

      const isBuffer = this.node?.type === 'Buffer' && Array.isArray(this.node.data);

      if (!isBuffer && !this.isLeaf) {
        return;
      }

      const path = this.path.join('.');
      const whitelisted = isWhitelisted(path);
      const blacklisted = isBlacklisted(path);

      if (blacklisted || !whitelisted) {
        const replacedValue = replacement(this.key, this.node, this.path);

        if (trim && replacedValue === DEFAULT_REPLACEMENT) {
          const path = this.path.map(value => (isNaN(value) ? value : '[]'));

          blacklistedKeys.add(path.join('.'));

          return this.delete();
        }

        this.update(replacedValue);
      } else if (isBuffer) {
        return this.update(Buffer.from(this.node), true);
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
 * Default serializer for Datadog.
 */

function datadogSerializer(error) {
  return {
    ...error,
    kind: error.name || 'Error'
  };
}

/**
 * Module exports `defaultSerializers`.
 */

module.exports.defaultSerializers = {
  datadogSerializer,
  error: serializeError
};
