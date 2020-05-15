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
    it('should allow circular references', () => {
      const object = {};

      object.reference = object;

      const anonymize = anonymizer({ whitelist: ['*'] });

      expect(anonymize(object)).toEqual({ reference: '[Circular ~]' });
    });

    describe('whitelist', () => {
      const whitelist = ['key1', 'key2', 'key3'];

      whitelist.forEach(key => {
        it(`should not obfuscate \`${key}\``, () => {
          const anonymize = anonymizer({ whitelist });

          expect(anonymize({ [key]: 'foo' })).toEqual({ [key]: 'foo' });
        });

        it(`should not obfuscate \`${key}\` with different casing`, () => {
          const anonymize = anonymizer({ whitelist });

          expect(anonymize({ [key.toUpperCase()]: 'foo' })).toEqual({ [key.toUpperCase()]: 'foo' });
          expect(anonymize({ [key.toLowerCase()]: 'foo' })).toEqual({ [key.toLowerCase()]: 'foo' });
        });

        it(`should obfuscate keys that contain \`${key}\``, () => {
          const anonymize = anonymizer({ whitelist });

          expect(anonymize({ [`${key}foo`]: 'bar' })).toEqual({ [`${key}foo`]: '--REDACTED--' });
          expect(anonymize({ [`foo${key}`]: 'bar' })).toEqual({ [`foo${key}`]: '--REDACTED--' });
          expect(anonymize({ [`foo${key}foo`]: 'bar' })).toEqual({ [`foo${key}foo`]: '--REDACTED--' });
        });
      });

      it(`should obfuscate keys whose type is Buffer`, () => {
        const anonymize = anonymizer();

        expect(anonymize({ foo: Buffer.from('foobarfoobar') })).toEqual({ foo: '--REDACTED--' });
      });

      it(`should not obfuscate Buffer-type keys that are whitelisted`, () => {
        const anonymize = anonymizer({ whitelist: ['foo'] });

        expect(anonymize({ foo: Buffer.from('foobarfoobar') })).toEqual({ foo: Buffer.from('foobarfoobar') });
      });

      it(`should default to an empty whitelist`, () => {
        const anonymize = anonymizer();

        expect(anonymize({ foo: 'foo' })).toEqual({ foo: '--REDACTED--' });
      });

      it('should not obfuscate recursively the keys of an object that are part of the whitelist', () => {
        const anonymize = anonymizer({ whitelist });

        expect(
          anonymize({
            foo: {
              bar: {
                baz: { bax: [2, 3, { bax: 4, [whitelist[1]]: '5' }] },
                [whitelist[0]]: 'foobar',
                [whitelist[2]]: 'foobiz'
              }
            }
          })
        ).toEqual({
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
        const anonymize = anonymizer({ whitelist: ['foo'] });

        expect(anonymize({ foo: 'bar' })).toEqual({ foo: 'bar' });
      });

      it('should not treat a `.` in the whitelist as a special character in the regexp', () => {
        const anonymize = anonymizer({ whitelist: ['foo.bar'] });

        expect(anonymize({ foo: { bar: 'biz' }, fooabar: 'foobiz' })).toEqual({
          foo: { bar: 'biz' },
          fooabar: '--REDACTED--'
        });
      });

      it('should allow using `*` in the whitelist path', () => {
        const anonymize = anonymizer({ whitelist: ['*.foo', '*.foobar'] });

        expect(anonymize({ parent: { foo: 'bar', foobar: 'foobiz' } })).toEqual({
          parent: { foo: 'bar', foobar: 'foobiz' }
        });
      });
    });

    describe('blacklist', () => {
      it(`should default to an empty blacklist`, () => {
        const anonymize = anonymizer({ whitelist: ['foo'] });

        expect(anonymize({ foo: 'foo' })).toEqual({ foo: 'foo' });
      });

      it('should not treat a `.` in the blacklist as a special character in the regexp', () => {
        const anonymize = anonymizer({ blacklist: ['foo.bar'], whitelist: ['fooabar'] });

        expect(anonymize({ foo: { bar: 'biz' }, fooabar: 'foobiz' })).toEqual({
          foo: { bar: '--REDACTED--' },
          fooabar: 'foobiz'
        });
      });

      describe('in case of collision', () => {
        it('should prioritize blacklist over whitelist', () => {
          const anonymize = anonymizer({ blacklist: ['key1.innerKey1'], whitelist: ['key1.innerKey1'] });

          expect(
            anonymize({
              key1: { innerKey1: 'bar', innerKey2: 'foo' }
            })
          ).toEqual({
            key1: { innerKey1: '--REDACTED--', innerKey2: '--REDACTED--' }
          });
        });

        it(`should obfuscate key with different casing`, () => {
          const anonymize = anonymizer({ blacklist: ['key1'], whitelist: ['KEy1'] });

          expect(anonymize({ KEy1: 'foo' })).toEqual({ KEy1: '--REDACTED--' });
        });

        it('should allow using `*` in blacklist path', () => {
          const whitelist = ['key1.*', 'key2.innerKey2'];
          const blacklist = ['*innerKey2'];
          const anonymize = anonymizer({ blacklist, whitelist });

          expect(
            anonymize({
              key1: { innerKey1: 'bar', innerKey2: 'bam' },
              key2: { innerKey1: 'bar', innerKey2: 'bam' }
            })
          ).toEqual({
            key1: { innerKey1: 'bar', innerKey2: '--REDACTED--' },
            key2: { innerKey1: '--REDACTED--', innerKey2: '--REDACTED--' }
          });
        });

        it(`should obfuscate Buffer-type keys that are blacklisted`, () => {
          const anonymize = anonymizer({ blacklist: ['foo'], whitelist: ['foo'] });

          expect(anonymize({ foo: Buffer.from('foobarfoobar') })).toEqual({ foo: '--REDACTED--' });
        });

        it('should obfuscate recursively the keys of an object that are part of the blacklist', () => {
          const anonymize = anonymizer({
            blacklist: ['foo.bar.*'],
            whitelist: ['foo.bar.key1', 'foo.bar.key2', 'foo.bar.baz.bax.*', '*key1']
          });

          expect(
            anonymize({
              foo: {
                bar: {
                  baz: { bax: [2, 3, { bax: 4, key1: '5' }] },
                  key1: 'foobar',
                  key2: 'foobiz'
                }
              }
            })
          ).toEqual({
            foo: {
              bar: {
                baz: { bax: ['--REDACTED--', '--REDACTED--', { bax: '--REDACTED--', key1: '--REDACTED--' }] },
                key1: '--REDACTED--',
                key2: '--REDACTED--'
              }
            }
          });
        });
      });
    });
  });
});
