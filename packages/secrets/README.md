# secrets

Owns the secrets read from the environment or from the file system. Every
secret is a string, so the shape of the data is always a record of strings.

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

## NestJS

`@nestjs/common` is an optional peer dependency: installing `@meletiaat/secrets` outside Nest
installs nothing new. Nest applications import `SecretsModule` from the `@meletiaat/secrets/nestjs`
entry point, which reads the secrets once at bootstrap and exports the container under the `Secrets`
token:

```ts
import { Module, Injectable } from '@nestjs/common';
import { Secrets } from '@meletiaat/secrets';
import { SecretsModule } from '@meletiaat/secrets/nestjs';

type AppSecrets = {
  DB_PASSWORD: string;
  PORT: string;
};

@Module({
  imports: [
    SecretsModule.forRoot({ readMode: 'file', basePath: '/run/secrets' }),
  ],
})
export class AppModule {}

@Injectable()
export class DatabaseService {
  constructor(private readonly secrets: Secrets<AppSecrets>) {}

  connect() {
    return new Database(this.secrets.get('DB_PASSWORD'));
  }
}
```

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
