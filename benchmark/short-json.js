'use strict';

/**
 * Module dependencies.
 */

const anonymizer = require('../src');
const benchmark = require('benny');

const obj = { foo: { bar: 'biz' }, qux: '123' };

module.exports = benchmark.suite(
  'Short JSON',

  benchmark.add('Anonymize all', () => {
    const anonymize = anonymizer({ blacklist: ['*'] });

    return () => anonymize(obj);
  }),

  benchmark.add('Anonymize none', () => {
    const anonymize = anonymizer({ whitelist: ['*'] });

    return () => anonymize(obj);
  }),

  benchmark.add('Anonymize some', () => {
    const anonymize = anonymizer({ whitelist: ['foo.bar'] });

    return () => anonymize(obj);
  }),

  benchmark.cycle(),
  benchmark.complete(),
  benchmark.save({ file: 'short-json', format: 'json', version: require('../package.json').version })
);
