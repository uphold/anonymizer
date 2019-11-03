'use strict';

/**
 * Module dependencies.
 */

const { serializeError } = require('serialize-error');
const stringify = require('json-stringify-safe');
const traverse = require('traverse');

/**
 * Constants.
 */

const replacement = '--REDACTED--';

/**
 * Apply serializers.
 */

function applySerializers(values, serializers) {
  for (const key in serializers) {
    if (values[key] === undefined) {
      return;
    }

    try {
      values[key] = serializers[key](values[key]);
    } catch (error) {
      values[key] = `Anonymize ERROR: Error while applying ${key} serializer: ${error.message}`;
    }
  }
}

/**
 * Module exports.
 */

module.exports = (whitelist = [], options = {}) => {
  // Add error serializers as default serializers.
  const serializers = {
    e: serializeError,
    err: serializeError,
    error: serializeError
  };

  for (const key in options.serializers) {
    const serializer = options.serializers[key];

    if (typeof serializer !== 'function') {
      throw new TypeError(`Invalid serializer for ${key} property: must be a function`);
    }

    serializers[key] = serializer;
  }

  const terms = whitelist.join('|');
  const paths = new RegExp(`^(${terms.replace('.', '\\.').replace(/\*/g, '.*')})$`, 'i');

  return values => {
    applySerializers(values, serializers);

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
