# anonymizer
Object redaction with whitelist and blacklist. Blacklist items have higher priority and will always supercede the whitelist.

## Arguments
1. `whitelist` _(Array)_: The whitelist array.
2. `blacklist` _(Array)_: The blacklist array.

### Example

```js
const anonymizer = require('@uphold/anonymizer');
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
