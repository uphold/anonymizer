# anonymizer
Object redaction with whitelist and blacklist. Blacklist items have higher priority and will always supercede the whitelist.

## Arguments
1. `whitelist` _(Array)_: The whitelist array.
2. `blacklist` _(Array)_: The blacklist array.
3. `options` _(Object)_: An object with optional options.

    `options.replacement` _(Function)_: A function that allows customizing the replacement value (default implementation is `--REDACTED--`).

    `options.serializers` _(List[Object])_: A list with serializers to apply. Each serializers must contain two properties: `path` (path for the value to be serialized, must be a `string`) and `serializer` (function to be called on the path's value).

    `options.trim` _(Boolean)_: A flag that enables trimming all redacted values, saving their keys to a `__redacted__` list (default value is `false`).

### Example

```js
const { anonymizer } = require('@uphold/anonymizer');
const whitelist = ['foo.key', 'foo.depth.*', 'bar.*', 'toAnonymize.baz', 'toAnonymizeSuperString'];
const blacklist = ['foo.depth.innerBlacklist', 'toAnonymize.*'];
const anonymize = anonymizer({ blacklist, whitelist });

const data = {
  foo: { key: 'public', another: 'bar', depth: { bar: 10, innerBlacklist: 11 } },
  bar: { foo: 1, bar: 2 },
  toAnonymize: { baz: 11, bar: 12 },
  toAnonymizeSuperString: 'foo'
};

anonymize(data);

// {
//   foo: {
//     key: 'public',
//     another: '--REDACTED--',
//     depth: { bar: 10, innerBlacklist: '--REDACTED--' }
//   },
//   bar: { foo: 1, bar: 2 },
//   toAnonymize: { baz: '--REDACTED--', bar: '--REDACTED--' },
//   toAnonymizeSuperString: '--REDACTED--'
// }
```

#### Example using serializers

```js
const { anonymizer } = require('@uphold/anonymizer');
const whitelist = ['foo.key', 'foo.depth.*', 'bar.*', 'toAnonymize.baz'];
const blacklist = ['foo.depth.innerBlacklist'];
const serializers = [
  { path: 'foo.key', serializer: () => 'biz' },
  { path: 'toAnonymize', serializer: () => ({ baz: 'baz' }) }
]
const anonymize = anonymizer({ blacklist, whitelist }, { serializers });

const data = {
  foo: { key: 'public', another: 'bar', depth: { bar: 10, innerBlacklist: 11 } },
  bar: { foo: 1, bar: 2 },
  toAnonymize: {}
};

anonymize(data);

// {
//   foo: {
//     key: 'biz',
//     another: '--REDACTED--',
//     depth: { bar: 10, innerBlacklist: '--REDACTED--' }
//   },
//   bar: { foo: 1, bar: 2 },
//   toAnonymize: { baz: 'baz' }
// }
```

### Default serializers

The introduction of serializers also added the possibility of using serializer functions exported by our module. The list of default serializers is presented below:
- error

#### Example

```js
const { anonymizer, defaultSerializers } = require('@uphold/anonymizer');
const serializers = [
  { path: 'foo', serializer: defaultSerializers.error }
];

const anonymize = anonymizer({}, { serializers });

const data = { foo: new Error('Foobar') };

anonymize(data);

// {
//   foo: {
//     name: '--REDACTED--',
//     message: '--REDACTED--',
//     stack: '--REDACTED--'
//   }
// }
```

## Releasing a new version

- Diff the current code with the latest tag and make sure the output is expected.

  ```sh
  git diff $(git describe --tags `git rev-list --tags --max-count=1`)..master
  ```

- Create a release commit and tag using [semver](http://semver.org) standards, and push them.

  ```sh
  yarn release ["major" | "minor" | "patch" | <custom version number>]
  git push origin master --tags
  ```

## License

MIT
