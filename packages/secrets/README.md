# secrets

Owns the secrets read from the environment or from the file system. Every
secret is a string, so the shape of the data is always a record of strings.

## Usage

```ts
import { Secrets } from '@utilities/secrets';

type AppSecrets = {
  DB_PASSWORD: string;
  PORT: string;
};

const secrets = await Secrets.read<AppSecrets>({ readMode: 'environment' });

secrets.get('DB_PASSWORD'); // string
```

The container owns the secrets, and they are only reachable through
`get(key)`. The shape is a plain type: `S` is constrained to
`Record<string, string>` and defaults to it, so `Secrets.read()` without a
shape owns the whole source.

| `readMode`                | Source                                                    |
| ------------------------- | --------------------------------------------------------- |
| `'environment'` (default)  | every string variable of `process.env`                   |
| `'file'`                  | every file under `basePath`, keyed by file name, trimmed |

```ts
const secrets = await Secrets.read<AppSecrets>({ readMode: 'file', basePath: '/run/secrets' });
secrets.get('PORT');
```

## Building

Run `nx build secrets` to build the library.

## Running unit tests

Run `nx test secrets` to execute the unit tests via [Vitest](https://vitest.dev/).
