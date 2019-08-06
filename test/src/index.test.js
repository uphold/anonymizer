'use strict';

/**
 * Module dependencies.
 */

const anonymizer = require('src');

/**
 * Test `Anonymizer`.
 */

describe('Anonymizer', () => {
  describe('anonymize', () => {
    const whitelist = ['key1', 'key2', 'key3'];

    whitelist.forEach(key => {
      it(`should not obfuscate \`${key}\``, () => {
        const anonymize = anonymizer(whitelist);

        expect(anonymize({ [key]: 'foo' })).toEqual({ [key]: 'foo' });
      });

      it(`should not obfuscate \`${key}\` with different casing`, () => {
        const anonymize = anonymizer(whitelist);

        expect(anonymize({ [key.toUpperCase()]: 'foo' })).toEqual({ [key.toUpperCase()]: 'foo' });
        expect(anonymize({ [key.toLowerCase()]: 'foo' })).toEqual({ [key.toLowerCase()]: 'foo' });
      });

      it(`should obfuscate keys that contain \`${key}\``, () => {
        const anonymize = anonymizer(whitelist);

        expect(anonymize({ [`${key}foo`]: 'bar' })).toEqual({ [`${key}foo`]: '--REDACTED--' });
        expect(anonymize({ [`foo${key}`]: 'bar' })).toEqual({ [`foo${key}`]: '--REDACTED--' });
        expect(anonymize({ [`foo${key}foo`]: 'bar' })).toEqual({ [`foo${key}foo`]: '--REDACTED--' });
      });
    });

    it('should not obfuscate recursively the keys of an object that are part of the whitelist', () => {
      const anonymize = anonymizer(whitelist);

      expect(anonymize({
        foo: {
          bar: {
            baz: { bax: [2, 3, { bax: 4, [whitelist[1]]: '5' }] },
            [whitelist[0]]: 'foobar',
            [whitelist[2]]: 'foobiz'
          }
        }
      })).toEqual({
        foo: {
          bar: {
            baz: { bax: ['--REDACTED--', '--REDACTED--', { bax: '--REDACTED--', [whitelist[1]]: '--REDACTED--' }] },
            [whitelist[0]]: '--REDACTED--',
            [whitelist[2]]: '--REDACTED--'
          }
        }
      });
    });

    it('should not obfuscate a key that is part of the whitelist', () => {
      const anonymize = anonymizer(['foo']);

      expect(anonymize({ foo: 'bar' })).toEqual({ foo: 'bar' });
    });

    it('should allow using `*` in the whitelist path', () => {
      const anonymize = anonymizer(['*.foo']);

      expect(anonymize({ parent: { foo: 'bar' } })).toEqual({ parent: { foo: 'bar' } });
    });
  });
});
