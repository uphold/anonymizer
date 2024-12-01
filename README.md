# anonymizer

Object redaction library that supports whitelisting, blacklisting and wildcard matching.

## Installation

```bash
npm install @uphold/anonymizer
```

## Usage

### Basic example

```js
import { anonymizer } from '@uphold/anonymizer';

const whitelist = ['key1', 'key2.foo'];
const anonymize = anonymizer({ whitelist });

const data = {
  key1: 'bar',
  key2: {
    foo: 'bar',
    bar: 'baz',
    baz: {
      foo: 'bar',
      bar: 'baz'
    }
  }
};

anonymize(data);

// {
//   key1: 'bar',
//   key2: {
//     foo: 'bar',
//     bar: '--REDACTED--',
//     baz: {
//       foo: '--REDACTED--'
//       bar: '--REDACTED--'
//     }
//   }
// }
```

### Wildcard matching example

Using `*` allows you to match any character in a key, except for `.`.
This is similar to how `glob` allows you to use `*` to match any character, except for `/`.

```js
import { anonymizer } from '@uphold/anonymizer';

const whitelist = ['key2.*'];
const anonymize = anonymizer({ whitelist });

const data = {
  key1: 'bar',
  key2: {
    foo: 'bar',
    bar: 'baz',
    baz: {
      foo: 'bar',
      bar: 'baz'
    }
  }
};

anonymize(data);

// {
//   key1: '--REDACTED--',
//   key2: {
//     foo: 'bar',
//     bar: 'baz',
//     baz: {
//       foo: '--REDACTED--',
//       bar: '--REDACTED--'
//     }
//   }
// }
```

### Double wildcard matching example

Using `**` allows you to match any nested key.
This is similar to how `glob` allows you to use `**` to match any nested directory.

```js
import { anonymizer } from '@uphold/anonymizer';

const whitelist = ['key2.**', '**.baz'];
const blacklist = ['key2.bar']
const anonymize = anonymizer({ blacklist, whitelist });

const data = {
  key1: 'bar',
  key2: {
    foo: 'bar',
    bar: 'baz',
    baz: {
      foo: 'bar',
      bar: 'baz'
    }
  },
  key3: {
    foo: {
      baz: 'biz'
    }
  }
};

anonymize(data);

// {
//   key1: '--REDACTED--',
//   key2: {
//     foo: 'bar',
//     bar: '--REDACTED--',
//     baz: {
//       foo: 'bar',
//       bar: 'baz'
//     }
//   },
//   key3: {
//     foo: {
//       baz: 'biz'
//     }
//   }
// }
```

### Custom replacement example

By default, the replacement value is `--REDACTED--`. You can customize it by passing a `replacement` function in the options.

Here's an example that keeps strings partially redacted:

```js
import { anonymizer } from '@uphold/anonymizer';

const replacement = (key, value, path) => {
  if (typeof value !== 'string') {
    return '--REDACTED--';
  }

  // Keep the first half of the string and redact the rest.
  const charsToKeep = Math.floor(value.length / 2);

  return value.substring(0, charsToKeep) + '*'.repeat(Math.min(value.length - charsToKeep, 100));
};

const anonymize = anonymizer({}, { replacement });

const data = {
  key1: 'bar',
  key2: {
    foo: 'bar',
    bar: 'baz',
    baz: {
      foo: 'bar',
      bar: 'baz'
    }
  }
};

anonymize(data);

// {
//   key1: 'b**',
//   key2: {
//     foo: 'b**'
//     bar: 'b**',
//     baz: {
//       foo: 'b**',
//       bar: 'b**'
//     },
//   }
// }
```

### Trim redacted values to keep output shorter

In certain scenarios, you may want to trim redacted values to keep the output shorter. Such example is if you are redacting logs and sending them to a provider, which may charge you based on the amount of data sent and stored.

This can be achieved by setting the `trim` option to `true`, like so:

```js
const whitelist = ['key1', 'key2.foo'];
const anonymize = anonymizer({ whitelist }, { trim: true });

const data = {
  key1: 'bar',
  key2: {
    foo: 'bar',
    bar: 'baz',
    baz: {
      foo: 'bar',
      bar: 'baz'
    }
  }
};

anonymize(data);

// {
//   __redacted__: [ 'key2.bar', 'key2.baz.foo', 'key2.baz.bar']
//   key1: 'bar',
//   key2: {
//     foo: 'bar'
//   }
// }
```

### Serializers example

Serializers allow you to apply custom transformations to specific values before being redacted.

Here's an example:

```js
const { anonymizer } = require('@uphold/anonymizer');
const whitelist = ['foo.key'];
const serializers = [
  { path: 'foo.key', serializer: () => 'biz' },
]
const anonymize = anonymizer({ whitelist }, { serializers });

const data = {
  foo: { key: 'public' },
};

anonymize(data);

// {
//   foo: {
//     key: 'biz'
//   }
// }
```

Take a look at the [built-in serializers](#serializers) for common use cases.

## API

### anonymizer({ whitelist, blacklist }, options)

Returns a function that redacts a given object based on the provided whitelist and blacklist.

#### whitelist

Type: `Array`  
Default: `[]`

An array of whitelisted patterns to use when matching against object paths that should not be redacted.

#### blacklist

Type: `Array`  
Default: `[]`

An array of blacklisted patterns to use when matching against object paths that should be redacted.

By default, every value is redacted. However, the blacklist can be used in conjunction with a whitelist. The values that match the blacklist will be redacted, even if they match the whitelist.

#### options

##### options.replacement

Type: `Function`  
Default: `(key, value, path) => '--REDACTED--'`

A function that allows customizing the replacement value (default implementation is `--REDACTED--`).

It receives the following arguments: `key` _(String)_, `value` _(Any)_, and `path` _(String)_.

##### options.serializers

Type: `Array`  
Default: `[]`

A list with serializers to apply. Each serializers must contain two properties: `path` (path for the value to be serialized, must be a `string`) and `serializer` (function to be called on the path's value).

##### options.trim

Type: `Boolean`  
Default: `false`

A flag that enables trimming all redacted values, saving their keys to a `__redacted__` list. Please note that trimming is only applied when the replacement value is `--REDACTED--`.

### serializers

Built-in serializer functions you may use in the `serializers` option.

#### error

Serializes an `Error` object.

#### datadogSerializer

Serializes an `Error` object for the purpose of sending it to Datadog, adding a `kind` property based on the error class name.

## Release process

The release of a version is automated via the [release](https://github.com/uphold/anonymizer/.github/workflows/release.yml) GitHub workflow. Run it by clicking the "Run workflow" button.

## License

MIT
