'use strict';

/**
 * Module dependencies.
 */

const _ = require('lodash');
const peg = require('pegjs');
const stringify = require('json-stringify-safe');
const traverse = require('traverse');

/**
 * Constants.
 */

const replacement = '--REDACTED--';

/**
 * Module exports.
 */

const parser = peg.generate(`
  { const { set } = require('lodash'); }
  // Starting rule.
  start = (queryUrl)

  // String.
  string = $ [^\&\?\=]*

  // Query param.
  param = key:string [\=] value:string            { return { [key]: value } }

  // Query params.
  params = [\&]? param:param params:params?       { return { ...param, ...params }  }

  // Query.
  queryUrl = url:string [\?]* params:params*      { return { url: url, params: params[0] } }
  `);

module.exports = (whitelist = []) => {
  const terms = whitelist.join('|');
  const paths = new RegExp(`^(${terms.replace(/\*/g, '.*')})$`, 'i');

  return values => {
    const clone = JSON.parse(stringify(values));

    traverse(clone).forEach(function() {
      if (!this.isLeaf) {

        return;
      }

      if (typeof this.node === 'string' && this.node.includes('?')){
        const filter = _.filter(whitelist, val => val.includes(this.path.join('.')|| val === '*'));

        if (paths.test(this.path.join('.')) || !_.isEmpty(filter) ){
          const filterParams = filter.map(param => param.split('.').pop())
          const parsedString = parser.parse(this.node);
          const redactedString = [parsedString.url, '?'];
          const params = Object.entries(parsedString.params);

          for (let entry of params ){
            if (paths.test(this.path.join('.')) || !_.isEmpty(_.filter(filterParams, val => (val === entry[0] || val === '*' )))) {
              redactedString.push(entry[0],'=', entry[1]);
            }
            else {
              redactedString.push(entry[0], '=', replacement);
            }

            if (params.indexOf(entry) !== params.length - 1){
              redactedString.push('&');
            }
          };

          return this.update(redactedString.join(''));
        }
      }

      if (!paths.test(this.path.join('.'))) {
        this.update(replacement);
      }
    });

    return clone;
  };
};
