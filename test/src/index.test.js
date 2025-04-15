'use strict';

/**
 * Module dependencies.
 */

const { anonymizer, serializers: builtinSerializers } = require('src');
const { generateObjectSample, generateObjectSamplePaths } = require('./benchmark/samples');

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

    it('should obfuscate values whose type is Buffer', () => {
      const anonymize = anonymizer();

      expect(anonymize({ foo: Buffer.from('foobarfoobar') })).toEqual({ foo: '--REDACTED--' });
    });

    describe('whitelist', () => {
      it('should default to an empty whitelist', () => {
        const anonymize = anonymizer();

        expect(anonymize({ foo: 'foo' })).toEqual({ foo: '--REDACTED--' });
      });

      it('should not obfuscate keys that are whitelisted', () => {
        const anonymize = anonymizer({ whitelist: ['key1', 'key2'] });

        expect(anonymize({ key1: 'foo', key2: 'bar', key3: 'baz' })).toEqual({
          key1: 'foo',
          key2: 'bar',
          key3: '--REDACTED--'
        });
      });

      it('should match in a case insensitive way', () => {
        const anonymize = anonymizer({ whitelist: ['foo'] });

        expect(anonymize({ FOO: 'foo' })).toEqual({ FOO: 'foo' });
      });

      it('should not obfuscate values of type Buffer that are whitelisted', () => {
        const anonymize = anonymizer({ whitelist: ['foo'] });

        expect(anonymize({ foo: Buffer.from('foobarfoobar') })).toEqual({ foo: Buffer.from('foobarfoobar') });
      });

      it('should escape special characters when building the regular expression', () => {
        const anonymize = anonymizer({ whitelist: ['f+o^o$b?a[r'] });

        expect(anonymize({ 'f+o^o$b?a[r': 'foo' })).toEqual({ 'f+o^o$b?a[r': 'foo' });
      });

      it('should support wildcard matching', () => {
        const data = {
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['foo', { foo: 'bar' }]
        };

        expect(anonymizer({ whitelist: ['parent1.*', 'parent3.*'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: 'bar'
          },
          parent2: { bar: '--REDACTED--', foo: '--REDACTED--' },
          parent3: ['foo', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ whitelist: ['parent2.f*'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: '--REDACTED--'
          },
          parent2: { bar: '--REDACTED--', foo: 'bar' },
          parent3: ['--REDACTED--', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ whitelist: ['parent2.*o'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: '--REDACTED--'
          },
          parent2: { bar: '--REDACTED--', foo: 'bar' },
          parent3: ['--REDACTED--', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ whitelist: ['parent2.*o*'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: '--REDACTED--'
          },
          parent2: { bar: '--REDACTED--', foo: 'bar' },
          parent3: ['--REDACTED--', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ whitelist: ['*e*.*'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: 'bar'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['foo', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ whitelist: ['parent1.*.foo'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: '--REDACTED--', foo: 'bar' },
            foo: '--REDACTED--'
          },
          parent2: { bar: '--REDACTED--', foo: '--REDACTED--' },
          parent3: ['--REDACTED--', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ whitelist: ['*.foo'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: 'bar'
          },
          parent2: { bar: '--REDACTED--', foo: 'bar' },
          parent3: ['--REDACTED--', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ whitelist: ['*t1.foo'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: 'bar'
          },
          parent2: { bar: '--REDACTED--', foo: '--REDACTED--' },
          parent3: ['--REDACTED--', { foo: '--REDACTED--' }]
        });
      });

      it('should support double wildcard matching', () => {
        const data = {
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['foo', { foo: 'bar' }]
        };

        expect(anonymizer({ whitelist: ['parent1.**', 'parent3.**'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: '--REDACTED--', foo: '--REDACTED--' },
          parent3: ['foo', { foo: 'bar' }]
        });

        expect(anonymizer({ whitelist: ['parent**'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['foo', { foo: 'bar' }]
        });

        expect(anonymizer({ whitelist: ['parent1.c**'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: '--REDACTED--'
          },
          parent2: { bar: '--REDACTED--', foo: '--REDACTED--' },
          parent3: ['--REDACTED--', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ whitelist: ['parent1.**.foo'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: '--REDACTED--', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: '--REDACTED--', foo: '--REDACTED--' },
          parent3: ['--REDACTED--', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ whitelist: ['parent1.**.oo'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: '--REDACTED--'
          },
          parent2: { bar: '--REDACTED--', foo: '--REDACTED--' },
          parent3: ['--REDACTED--', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ whitelist: ['**.foo'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: '--REDACTED--', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: '--REDACTED--', foo: 'bar' },
          parent3: ['--REDACTED--', { foo: 'bar' }]
        });

        expect(anonymizer({ whitelist: ['**oo'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: '--REDACTED--', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: '--REDACTED--', foo: 'bar' },
          parent3: ['--REDACTED--', { foo: 'bar' }]
        });

        expect(anonymizer({ whitelist: ['**.oo'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: '--REDACTED--'
          },
          parent2: { bar: '--REDACTED--', foo: '--REDACTED--' },
          parent3: ['--REDACTED--', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ whitelist: ['**.fo'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: '--REDACTED--'
          },
          parent2: { bar: '--REDACTED--', foo: '--REDACTED--' },
          parent3: ['--REDACTED--', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ whitelist: ['parent3.**'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: '--REDACTED--'
          },
          parent2: { bar: '--REDACTED--', foo: '--REDACTED--' },
          parent3: ['foo', { foo: 'bar' }]
        });
      });
    });

    describe('blacklist', () => {
      it('should default to an empty blacklist', () => {
        const anonymize = anonymizer({ whitelist: ['foo'] });

        expect(anonymize({ foo: 'foo' })).toEqual({ foo: 'foo' });
      });

      it('should obfuscate keys that are blacklisted', () => {
        const anonymize = anonymizer({ blacklist: ['key1', 'key2'], whitelist: ['**'] });

        expect(anonymize({ key1: 'foo', key2: 'bar', key3: 'baz' })).toEqual({
          key1: '--REDACTED--',
          key2: '--REDACTED--',
          key3: 'baz'
        });
      });

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

      it('should match in a case insensitive way', () => {
        const anonymize = anonymizer({ blacklist: ['key1'], whitelist: ['KEy1'] });

        expect(anonymize({ KEy1: 'foo' })).toEqual({ KEy1: '--REDACTED--' });
      });

      it('should escape special characters when building the regular expression', () => {
        const anonymize = anonymizer({ blacklist: ['f+o^o$b?a[r'], whitelist: ['**'] });

        expect(anonymize({ 'f+o^o$b?a[r': 'FOO' })).toEqual({ 'f+o^o$b?a[r': '--REDACTED--' });
      });

      it('should support wildcard matching', () => {
        const data = {
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['foo', { foo: 'bar' }]
        };

        expect(anonymizer({ blacklist: ['parent1.*', 'parent3.*'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: '--REDACTED--'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['--REDACTED--', { foo: 'bar' }]
        });

        expect(anonymizer({ blacklist: ['parent2.f*'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: 'biz', foo: '--REDACTED--' },
          parent3: ['foo', { foo: 'bar' }]
        });

        expect(anonymizer({ blacklist: ['parent2.*o'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: 'biz', foo: '--REDACTED--' },
          parent3: ['foo', { foo: 'bar' }]
        });

        expect(anonymizer({ blacklist: ['parent2.*o*'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: 'biz', foo: '--REDACTED--' },
          parent3: ['foo', { foo: 'bar' }]
        });

        expect(anonymizer({ blacklist: ['*e*.*'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: '--REDACTED--'
          },
          parent2: { bar: '--REDACTED--', foo: '--REDACTED--' },
          parent3: ['--REDACTED--', { foo: 'bar' }]
        });

        expect(anonymizer({ blacklist: ['parent1.*.foo'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: '--REDACTED--' },
            foo: 'bar'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['foo', { foo: 'bar' }]
        });

        expect(anonymizer({ blacklist: ['*.foo'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: '--REDACTED--'
          },
          parent2: { bar: 'biz', foo: '--REDACTED--' },
          parent3: ['foo', { foo: 'bar' }]
        });

        expect(anonymizer({ blacklist: ['*t1.foo'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: '--REDACTED--'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['foo', { foo: 'bar' }]
        });
      });

      it('should support double wildcard matching', () => {
        const data = {
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['foo', { foo: 'bar' }]
        };

        expect(anonymizer({ blacklist: ['parent1.**', 'parent3.**'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: '--REDACTED--'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['--REDACTED--', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ blacklist: ['parent**'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: '--REDACTED--'
          },
          parent2: { bar: '--REDACTED--', foo: '--REDACTED--' },
          parent3: ['--REDACTED--', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ blacklist: ['parent1.c**'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: '--REDACTED--', foo: '--REDACTED--' },
            foo: 'bar'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['foo', { foo: 'bar' }]
        });

        expect(anonymizer({ blacklist: ['parent1.**.foo'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: '--REDACTED--' },
            foo: '--REDACTED--'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['foo', { foo: 'bar' }]
        });

        expect(anonymizer({ blacklist: ['**.foo'], whitelist: ['**'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: 'biz', foo: '--REDACTED--' },
            foo: '--REDACTED--'
          },
          parent2: { bar: 'biz', foo: '--REDACTED--' },
          parent3: ['foo', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ blacklist: ['**oo'], whitelist: ['**'] })(data)).toEqual({
          foo: '--REDACTED--',
          parent1: {
            child: { bar: 'biz', foo: '--REDACTED--' },
            foo: '--REDACTED--'
          },
          parent2: { bar: 'biz', foo: '--REDACTED--' },
          parent3: ['foo', { foo: '--REDACTED--' }]
        });

        expect(anonymizer({ blacklist: ['**.oo'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['foo', { foo: 'bar' }]
        });

        expect(anonymizer({ blacklist: ['**.fo'], whitelist: ['**'] })(data)).toEqual({
          foo: 'bar',
          parent1: {
            child: { bar: 'biz', foo: 'bar' },
            foo: 'bar'
          },
          parent2: { bar: 'biz', foo: 'bar' },
          parent3: ['foo', { foo: 'bar' }]
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
        const whitelist = ['**'];

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
        const whitelist = ['**'];
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
        const fooerror = jest.fn(builtinSerializers.error);
        const whitelist = ['**'];
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
        const whitelist = ['**'];
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
        const serializer = jest.fn(builtinSerializers.datadogError);
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
        const serializer = jest.fn(builtinSerializers.datadogError);
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
          const serialized = builtinSerializers.datadogError(value);

          value.foo.for = 'bar';

          return serialized;
        });
        const serializers = [{ path: 'error', serializer }];
        const whitelist = ['**'];
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
          const serialized = builtinSerializers.datadogError(value);

          value.foo.for.bar.foo = 'bar';

          return serialized;
        });
        const serializers = [{ path: 'error', serializer }];
        const whitelist = ['**'];
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
        const whitelist = ['**'];
        const anonymize = anonymizer({ whitelist }, { serializers });

        const result = anonymize(data);

        expect(result).toEqual({
          foo: 'Anonymize ERROR: Error while applying serializer',
          foz: 'Anonymize ERROR: Error while applying serializer'
        });
        expect(serializer).toHaveBeenCalledTimes(2);
      });

      describe('built-in', () => {
        it('should serialize errors when `builtinSerializers.error()` is applied', () => {
          const error = new Error('foobar');
          const serializer = jest.fn(builtinSerializers.error);
          const serializers = [
            { path: 'e', serializer },
            { path: 'err', serializer },
            { path: 'error', serializer }
          ];
          const whitelist = ['**'];
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

        it('should serialize errors when `builtinSerializers.datadogError()` is applied', () => {
          const error = new Error('foobar');
          const serializer = jest.fn(builtinSerializers.datadogError);
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
        const anonymize = anonymizer({});
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
        const anonymize = anonymizer({}, { serializers });
        const startTime = process.hrtime();

        anonymize(data);

        const endTime = process.hrtime(startTime);
        const msElapsed = endTime[1] / 1000000;

        expect(msElapsed).toBeLessThan(250);
        expect(serializer).toHaveBeenCalledTimes(32768);
      });

      it('should call `builtinSerializers.error` in all `32768` properties in less than `175` ms', () => {
        const depth = 10;
        const data = generateObjectSample({ depth, leafValue: () => new Error('foobar') });
        const serializer = jest.fn(builtinSerializers.error);
        const serializers = generateObjectSamplePaths({ depth }).map(path => ({ path, serializer }));
        const anonymize = anonymizer({}, { serializers });
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
