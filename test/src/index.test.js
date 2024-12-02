'use strict';

/**
 * Module dependencies.
 */

const {
  anonymizer,
  defaultSerializers: { datadogSerializer }
} = require('src');
const { generateObjectSample, generateObjectSamplePaths } = require('./benchmark/samples');
const { serializeError } = require('serialize-error');

/**
 * Test `Anonymizer`.
 */

describe('Anonymizer', () => {
  describe('anonymize', () => {
    it('should not traverse and obfuscate values that are not objects', () => {
      const anonymize = anonymizer({ whitelist: ['foo'] });
      const text = JSON.stringify({ foo: 'bar', qux: 'biz' });

      expect(anonymize(text)).toEqual(text);
    });

    it('should allow circular references', () => {
      const object = {};

      object.reference = object;

      const anonymize = anonymizer({ whitelist: ['*'] });

      expect(anonymize(object)).toEqual({ reference: '[Circular ~]' });
    });

    it('should obfuscate class getters', () => {
      class Foobar {
        get bar() {
          return 'biz';
        }

        toJSON() {
          return {
            bar: this.bar
          };
        }
      }

      const anonymize = anonymizer({ whitelist: ['foo.bar'] });
      const foo = new Foobar();

      expect(anonymize({ foo })).toEqual({ foo: { bar: 'biz' } });
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
        const anonymize = anonymizer({ whitelist: ['*.foo', '*.foobar', 'parent.*.biz'] });

        expect(anonymize({ parent: { foo: 'bar', foobar: 'foobiz', quux: { biz: 'baz', foobiz: 'bar' } } })).toEqual({
          parent: { foo: 'bar', foobar: 'foobiz', quux: { biz: 'baz', foobiz: '--REDACTED--' } }
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

    describe('replacement', () => {
      it('should return the default replacement', () => {
        const anonymize = anonymizer();

        expect(anonymize({ foo: 'bar' })).toEqual({ foo: '--REDACTED--' });
      });

      it('should accept a customizer function', () => {
        const replacement = (key, value) => {
          const url = new URL(value);

          for (const [search] of url.searchParams) {
            url.searchParams.set(search, '--REDACTED--');
          }

          return url.toString();
        };
        const anonymize = anonymizer({}, { replacement });

        expect(anonymize({ foo: 'https://example.com/?secret=verysecret' })).toEqual({
          foo: 'https://example.com/?secret=--REDACTED--'
        });
      });
    });

    describe('serializers', () => {
      it('should throw an error when serializer is not a function', () => {
        const serializers = [{ path: 'foo', serializer: 123 }];
        const whitelist = ['*'];

        try {
          anonymizer({ whitelist }, { serializers });

          fail();
        } catch (error) {
          expect(error).toBeInstanceOf(TypeError);
          expect(error.message).toEqual('Invalid serializer for `foo` path: must be a function');
        }
      });

      it('should apply serializers to existing paths', () => {
        const foobar = jest.fn(() => 'bii');
        const foobiz = jest.fn(() => 'bzz');
        const foobzz = jest.fn(() => ({ bar: 'biz' }));
        const whitelist = ['*'];
        const serializers = [
          { path: 'bar', serializer: foobiz },
          { path: 'foo', serializer: foobar },
          { path: 'foobar', serializer: foobzz }
        ];
        const anonymize = anonymizer({ whitelist }, { serializers });

        const result = anonymize({ foo: 'bar' });

        expect(foobar).toHaveBeenCalledTimes(1);
        expect(foobar).toHaveBeenCalledWith('bar');
        expect(foobiz).toHaveBeenCalledTimes(0);
        expect(foobzz).toHaveBeenCalledTimes(0);
        expect(result.foo).toEqual('bii');
      });

      it('should apply serializers to nested paths', () => {
        const error = new Error('foobar');
        const foobar = jest.fn(() => 'bii');
        const foobiz = jest.fn(() => 'bzz');
        const fooerror = jest.fn(serializeError);
        const whitelist = ['*'];
        const serializers = [
          { path: 'bar.foo', serializer: foobiz },
          { path: 'bar.error', serializer: fooerror },
          { path: 'foo.bar.biz', serializer: foobar }
        ];
        const anonymize = anonymizer({ whitelist }, { serializers });

        const result = anonymize({
          bar: { error, foo: 'bar' },
          foo: {
            bar: { biz: 'foo' }
          }
        });

        expect(foobar).toHaveBeenCalledTimes(1);
        expect(foobar).toHaveBeenCalledWith('foo');
        expect(foobiz).toHaveBeenCalledTimes(1);
        expect(foobiz).toHaveBeenCalledWith('bar');
        expect(result.bar.foo).toEqual('bzz');
        expect(result.bar.error).toHaveProperty('name', 'Error');
        expect(result.bar.error).toHaveProperty('message', 'foobar');
        expect(result.foo).toEqual({ bar: { biz: 'bii' } });
      });

      it('should not change original values by reference', () => {
        const data = { foo: 'bar', foz: { baz: 'baz', biz: 'biz' } };
        const foobar = jest.fn(() => 'bii');
        const fozbar = jest.fn(value => {
          value.baz = 'biz';

          return 'biz';
        });
        const whitelist = ['*'];
        const serializers = [
          { path: 'foo', serializer: foobar },
          { path: 'foz', serializer: fozbar }
        ];
        const anonymize = anonymizer({ whitelist }, { serializers });

        const result = anonymize(data);

        expect(data).toEqual({ foo: 'bar', foz: { baz: 'baz', biz: 'biz' } });
        expect(foobar).toHaveBeenCalledTimes(1);
        expect(foobar).toHaveBeenCalledWith('bar');
        expect(result.foo).toEqual('bii');
        expect(result.foz).toEqual('biz');
      });

      it('should serialize errors that extend `Error`', () => {
        class ValidationError extends Error {
          constructor(message) {
            super(message);
            this.name = 'ValidationError';
            this.foo = 'bar';
          }
        }

        const error = new ValidationError('foobar');
        const serializer = jest.fn(datadogSerializer);
        const serializers = [{ path: 'error', serializer }];
        const whitelist = ['error.foo', 'error.kind', 'error.message', 'error.name', 'error.stack'];
        const anonymize = anonymizer({ whitelist }, { serializers });

        const result = anonymize({ error });

        expect(serializer).toHaveBeenCalledTimes(1);
        expect(result.error).toEqual({
          foo: 'bar',
          kind: 'ValidationError',
          message: 'foobar',
          name: 'ValidationError',
          stack: error.stack
        });
      });

      it('should serialize errors that extend multiple classes', () => {
        class ErrorOne extends Error {
          constructor(message) {
            super(message);
            this.name = 'ErrorOne';
            this.foo = 'bar';
          }
        }

        class ErrorTwo extends ErrorOne {
          constructor(message) {
            super(message);
            this.name = 'ErrorTwo';
            this.foo = 'baz';
          }
        }

        const error = new ErrorTwo('foobar');
        const serializer = jest.fn(datadogSerializer);
        const serializers = [{ path: 'error', serializer }];
        const whitelist = ['error.foo', 'error.kind', 'error.message', 'error.name', 'error.stack'];
        const anonymize = anonymizer({ whitelist }, { serializers });

        const result = anonymize({ error });

        expect(serializer).toHaveBeenCalledTimes(1);
        expect(result.error).toEqual({
          foo: 'baz',
          kind: 'ErrorTwo',
          message: 'foobar',
          name: 'ErrorTwo',
          stack: error.stack
        });
      });

      it('should not change original values of serialized errors', () => {
        class ValidationError extends Error {
          constructor(message) {
            super(message);
            this.name = 'ValidationError';
            this.foo = { for: 'baz' };
          }
        }

        const error = new ValidationError('foobar');
        const serializer = jest.fn(value => {
          const serialized = datadogSerializer(value);

          value.foo.for = 'bar';

          return serialized;
        });
        const serializers = [{ path: 'error', serializer }];
        const whitelist = ['*'];
        const anonymize = anonymizer({ whitelist }, { serializers });

        const result = anonymize({ error });

        expect(serializer).toHaveBeenCalledTimes(1);
        expect(result.error).toEqual({
          foo: { for: 'bar' },
          kind: 'ValidationError',
          message: 'foobar',
          name: 'ValidationError',
          stack: error.stack
        });
        expect(error.foo.for).toEqual('baz');
      });

      it('should not change deep original values of serialized errors', () => {
        class ValidationError extends Error {
          constructor(message) {
            super(message);
            this.name = 'ValidationError';
            this.foo = { for: { bar: { foo: 'baz' } } };
          }
        }

        const error = new ValidationError('foobar');
        const serializer = jest.fn(value => {
          const serialized = datadogSerializer(value);

          value.foo.for.bar.foo = 'bar';

          return serialized;
        });
        const serializers = [{ path: 'error', serializer }];
        const whitelist = ['*'];
        const anonymize = anonymizer({ whitelist }, { serializers });

        const result = anonymize({ error });

        expect(serializer).toHaveBeenCalledTimes(1);
        expect(result.error).toEqual({
          foo: { for: { bar: { foo: 'bar' } } },
          kind: 'ValidationError',
          message: 'foobar',
          name: 'ValidationError',
          stack: error.stack
        });
        expect(error.foo.for.bar.foo).toEqual('baz');
      });

      it('should not propagate an error thrown by a serializer', () => {
        const data = { foo: 'bar', foz: 'biz' };
        const serializer = jest.fn(() => {
          throw new Error('foobar');
        });
        const serializers = [
          { path: 'foo', serializer },
          { path: 'foz', serializer }
        ];
        const whitelist = ['*'];
        const anonymize = anonymizer({ whitelist }, { serializers });

        const result = anonymize(data);

        expect(result).toEqual({
          foo: 'Anonymize ERROR: Error while applying serializer',
          foz: 'Anonymize ERROR: Error while applying serializer'
        });
        expect(serializer).toHaveBeenCalledTimes(2);
      });

      describe('defaultSerializers', () => {
        it('should serialize errors when `serializeError()` is applied', () => {
          const error = new Error('foobar');
          const serializer = jest.fn(serializeError);
          const serializers = [
            { path: 'e', serializer },
            { path: 'err', serializer },
            { path: 'error', serializer }
          ];
          const whitelist = ['*'];
          const anonymize = anonymizer({ whitelist }, { serializers });

          const result = anonymize({
            e: error,
            err: {
              statusCode: 400
            },
            error,
            error2: error,
            foo: 'bar'
          });

          expect(serializer).toHaveBeenCalledTimes(3);
          expect(result.e).toEqual({
            message: 'foobar',
            name: 'Error',
            stack: error.stack
          });
          expect(result.err).toEqual({
            statusCode: 400
          });
          expect(result.error).toEqual({
            message: 'foobar',
            name: 'Error',
            stack: error.stack
          });
          expect(result.error2).toEqual({});
          expect(result.foo).toEqual('bar');
        });

        it('should serialize errors when `datadogSerializer()` is applied', () => {
          const error = new Error('foobar');
          const serializer = jest.fn(datadogSerializer);
          const serializers = [
            { path: 'err', serializer },
            { path: 'error', serializer }
          ];
          const whitelist = ['error.foo', 'error.kind', 'error.message', 'error.name', 'error.stack'];
          const anonymize = anonymizer({ whitelist }, { serializers });

          const result = anonymize({
            e: error,
            err: {
              statusCode: 400
            },
            error,
            error2: error,
            foo: 'bar'
          });

          expect(serializer).toHaveBeenCalledTimes(2);
          expect(result.err).toEqual({
            kind: '--REDACTED--',
            statusCode: '--REDACTED--'
          });
          expect(result.error).toEqual({
            kind: 'Error',
            message: 'foobar',
            name: 'Error',
            stack: error.stack
          });
          expect(result.foo).toEqual('--REDACTED--');
        });
      });
    });

    describe('trim', () => {
      it('should group array keys', () => {
        const anonymize = anonymizer({ whitelist: ['foo'] }, { trim: true });

        expect(
          anonymize({
            buz: [{ biz: 'baz' }, { biz: 'biz' }, { bar: 'foo', biz: 'boz' }],
            foo: 'bar'
          })
        ).toEqual({
          __redacted__: ['buz.[].biz', 'buz.[].bar'],
          foo: 'bar'
        });
      });

      it('should trim obfuscated fields and add their paths to a `__redacted__` list', () => {
        const anonymize = anonymizer({ whitelist: ['foo'] }, { trim: true });

        expect(
          anonymize({
            biz: 'baz',
            buz: { bux: { qux: 'quux' } },
            foo: 'bar'
          })
        ).toEqual({
          __redacted__: ['biz', 'buz.bux.qux'],
          foo: 'bar'
        });
      });

      it('should not add `__redacted__` when anonymizing an empty object', () => {
        const anonymize = anonymizer({}, { trim: true });

        expect(anonymize({})).toEqual({});
      });

      it('should not trim obfuscated values that have different obfuscation techniques', () => {
        const replacement = (key, value) => {
          if (key === 'biz') {
            return value;
          }

          if (value === 'bux') {
            return '--HIDDEN--';
          }

          return '--REDACTED--';
        };
        const anonymize = anonymizer({ whitelist: ['foo'] }, { replacement, trim: true });

        expect(
          anonymize({
            biz: 'baz',
            buz: 'bux',
            foo: 'bar',
            qux: 'quux'
          })
        ).toEqual({
          __redacted__: ['qux'],
          biz: 'baz',
          buz: '--HIDDEN--',
          foo: 'bar'
        });
      });
    });

    describe.skip('benchmark', () => {
      it('should run a sample with `32768` properties in less than `150` ms', () => {
        const depth = 10;
        const data = generateObjectSample({ depth });
        const anonymize = anonymizer({ blacklist: ['*'] });
        const startTime = process.hrtime();

        anonymize(data);

        const endTime = process.hrtime(startTime);
        const msElapsed = endTime[1] / 1000000;

        expect(msElapsed).toBeLessThan(150);
      });

      it('should call serializers in all `32768` properties in less than `250` ms', () => {
        const depth = 10;
        const data = generateObjectSample({ depth });
        const serializer = jest.fn(() => 'bii');
        const serializers = generateObjectSamplePaths({ depth }).map(path => ({ path, serializer }));
        const anonymize = anonymizer({ blacklist: ['*'] }, { serializers });
        const startTime = process.hrtime();

        anonymize(data);

        const endTime = process.hrtime(startTime);
        const msElapsed = endTime[1] / 1000000;

        expect(msElapsed).toBeLessThan(250);
        expect(serializer).toHaveBeenCalledTimes(32768);
      });

      it('should call `serializeError` in all `32768` properties in less than `175` ms', () => {
        const depth = 10;
        const data = generateObjectSample({ depth, leafValue: () => new Error('foobar') });
        const serializer = jest.fn(serializeError);
        const serializers = generateObjectSamplePaths({ depth }).map(path => ({ path, serializer }));
        const anonymize = anonymizer({ blacklist: ['*'] }, { serializers });
        const startTime = process.hrtime();

        anonymize(data);

        const endTime = process.hrtime(startTime);
        const msElapsed = endTime[1] / 1000000;

        expect(msElapsed).toBeLessThan(175);
        expect(serializer).toHaveBeenCalledTimes(32768);
      });
    });
  });
});
