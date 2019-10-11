# anonymizer
Object redaction with whitelist as main feature.

## Arguments
1. `whitelist` _(Object)_: The whitelist object.

### Example

```js
const anonymizer = require('@uphold/anonymizer');
const whitelist = ['foo.key', 'bar.*'];
const anonymize = anonymizer(whitelist);

anonymize({ foo: { key: 'public', another: 'bar' }, bar: { foo: 1, bar: 2 } });

//=> { foo: { key: 'public', another: '--REDACTED--' }, bar: { foo: 1, bar: 2 } }
```

## License

MIT
