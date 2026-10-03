# secrets

Owns the secrets read from the environment or from the file system. Every
secret is a string, so the shape of the data is always a record of strings.

Use `environment` for local development, `file` on Kubernetes.

## Install

Published to the Meleti GitHub Packages npm registry:

```sh
npm install @meleti/secrets --registry=https://npm.pkg.github.com
```

```ini
# .npmrc
@meleti:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

## Usage

```ts
import { Secrets } from '@meleti/secrets';

type AppSecrets = {
  DB_PASSWORD: string;
  PORT: string;
};

const secrets = await Secrets.read<AppSecrets>({ readMode: 'environment' });

secrets.get('DB_PASSWORD'); // string
```

The container owns the secrets, and they are only reachable through
`get(key)`, which throws when the secret is not set — naming the file that
does not exist when reading from files. The shape is a plain type: `S` is
constrained to `Record<string, string>` and defaults to it, so
`Secrets.read()` without a shape owns the whole source.

| `readMode`                | Source                                                   |
| ------------------------- | -------------------------------------------------------- |
| `'environment'` (default) | every string variable of `process.env`                   |
| `'file'`                  | every file under `basePath`, keyed by file name, trimmed |

```ts
const secrets = await Secrets.read<AppSecrets>({
  readMode: 'file',
  basePath: '/run/secrets',
});
secrets.get('PORT');
```

## Building

Run `nx build secrets` to build the library.

## Running unit tests

Run `nx test secrets` to execute the unit tests via [Vitest](https://vitest.dev/).
