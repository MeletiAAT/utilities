# secrets

Owns the secrets read from the environment or from the file system. Every
secret is a string, and every key is either required or optional: a required
key is read with `get`, an optional key with `getOpt`.

Use `environment` for local development, `file` on Kubernetes.

## Install

Published to GitHub Packages under the `@meletiaat` scope:

```sh
npm install @meletiaat/secrets --registry=https://npm.pkg.github.com
```

```ini
# .npmrc
@meletiaat:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

## Usage

```ts
import { Secrets } from '@meletiaat/secrets';

const secrets = await Secrets.read<'DB_PASSWORD' | 'PORT', 'LOG_LEVEL'>({
  readMode: 'environment',
});

secrets.get('DB_PASSWORD'); // string
secrets.getOpt('LOG_LEVEL'); // string | undefined
```

The container owns the secrets, and they are only reachable through
`get(key)`, which reads a required secret and throws when it is not set —
naming the file that does not exist when reading from files — or
`getOpt(key)`, which reads a required or an optional secret and returns
`undefined` instead. A secret set to an empty string is a value: `getOpt`
returns `''` for it. `Secrets<Required, Optional>` owns
`SecretsDef<Required, Optional>`: the first type argument is the union of the
required keys, the second the union of the optional ones, and `get` rejects an
optional key at compile time, so an optional secret is never read as if the
source guaranteed it. `Required` defaults to `string` and `Optional` to
`never`, so `Secrets.read()` without type arguments owns the whole source and
`get` accepts any key.

| `readMode`                | Source                                                   |
| ------------------------- | -------------------------------------------------------- |
| `'environment'` (default) | every string variable of `process.env`                   |
| `'file'`                  | every file under `basePath`, keyed by file name, trimmed |

```ts
const secrets = await Secrets.read<'PORT' | 'DB_PASSWORD'>({
  readMode: 'file',
  basePath: '/run/secrets',
});
secrets.get('PORT');
```

## NestJS

`@nestjs/common` is an optional peer dependency: installing `@meletiaat/secrets` outside Nest
installs nothing new. Nest applications import `SecretsModule` from the `@meletiaat/secrets/nestjs`
entry point, which reads the secrets once at bootstrap and exports the container under the `Secrets`
token:

```ts
import { Module, Injectable } from '@nestjs/common';
import { Secrets } from '@meletiaat/secrets';
import { SecretsModule } from '@meletiaat/secrets/nestjs';

@Module({
  imports: [
    SecretsModule.forRoot({ readMode: 'file', basePath: '/run/secrets' }),
  ],
})
export class AppModule {}

@Injectable()
export class DatabaseService {
  constructor(
    private readonly secrets: Secrets<'DB_PASSWORD' | 'PORT', 'LOG_LEVEL'>,
  ) {}

  connect() {
    return new Database(this.secrets.get('DB_PASSWORD'));
  }
}
```

The provided token is the `Secrets` class, so the required and optional keys
are declared where the instance is injected, as in the example above.

`forRoot` takes the same options as `Secrets.read` and an optional second argument
(`{ isGlobal: true }`) to register the module globally. When the options themselves are dynamic,
`forRootAsync` builds them from injected providers:

```ts
SecretsModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    readMode: 'file',
    basePath: config.getOrThrow('SECRETS_DIR'),
  }),
});
```

## Building

Run `nx build secrets` to build the library.

## Running unit tests

Run `nx test secrets` to execute the unit tests via [Vitest](https://vitest.dev/).
