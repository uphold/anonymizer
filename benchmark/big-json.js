'use strict';

/**
 * Module dependencies.
 */

const anonymizer = require('../src');
const benchmark = require('benny');

const obj = {
  foo: { asd: { fgh: 123, foo: 'bar' }, bar: 'biz', jkl: [1, 2, 3] },
  qux: '123',
  tyu: {
    aa: 1,
    bb: 2,
    cc: 3,
    dd: 4,
    ee: 5,
    ff: 6,
    gg: 7,
    hh: 8,
    ii: 9,
    jj: 10,
    kk: 11,
    ll: 12,
    mm: 13,
    nn: 14,
    oo: 15,
    pp: 16,
    qq: 17,
    rr: 18,
    ss: 19,
    tt: 20,
    uu: 21,
    vv: 22,
    ww: 23,
    xx: 24,
    yy: 25,
    zz: 26
  }
};

module.exports = benchmark.suite(
  'Big JSON',

  benchmark.add('Anonymize all', () => {
    const anonymize = anonymizer({ blacklist: ['*'] });

    return () => anonymize(obj);
  }),

  benchmark.add('Anonymize none', () => {
    const anonymize = anonymizer({ whitelist: ['*'] });

    return () => anonymize(obj);
  }),

  benchmark.add('Anonymize some', () => {
    const anonymize = anonymizer({ whitelist: ['foo.bar', 'tyu.*'] });

    return () => anonymize(obj);
  }),

  benchmark.cycle(),
  benchmark.complete(),
  benchmark.save({ file: 'big-json', format: 'json', version: require('../package.json').version })
);
