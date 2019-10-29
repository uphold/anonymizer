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
