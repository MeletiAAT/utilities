import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface BaseSecretsOptions {
  /**
   * @description Source of the data
   */
  readMode?: 'environment' | 'file';
}

export interface FileSecretsOptions extends BaseSecretsOptions {
  readMode: 'file';
  basePath: string;
}

export interface EnvironmentSecretsOptions extends BaseSecretsOptions {
  readMode: 'environment';
}

/**
 * @description Options accepted by {@link Secrets}.
 */
export type SecretsOptions = FileSecretsOptions | EnvironmentSecretsOptions;

/**
 * @description Shape of the secrets a {@link Secrets} container owns: each
 * required key maps to a `string`, each optional key to `string | undefined`.
 *
 * @example
 * ```ts
 * type AppSecrets = SecretsDef<'DB_PASSWORD' | 'PORT', 'LOG_LEVEL'>;
 * ```
 */
export type SecretsDef<
  Required extends PropertyKey,
  Optional extends PropertyKey,
> = Record<Required, string> & Record<Optional, string | undefined>;

/**
 * @description Secrets read from the configured source.
 *
 * @example
 * ```ts
 * const secrets = await Secrets.read<'DB_URL' | 'PORT', 'LOG_LEVEL'>({
 *   readMode: 'environment',
 * });
 *
 * const db = new Database(secrets.get('DB_URL'));
 * const logLevel = secrets.getOpt('LOG_LEVEL');
 * ```
 */
export class Secrets<
  Required extends PropertyKey = string,
  Optional extends PropertyKey = never,
> {
  readonly #data: SecretsDef<Required, Optional>;
  readonly #options: SecretsOptions;

  private constructor(
    data: SecretsDef<Required, Optional>,
    options: SecretsOptions,
  ) {
    this.#data = data;
    this.#options = options;
  }

  /**
   * @description Reads a resolved required secret.
   *
   * @param key - Name of a required secret.
   * @throws {Error} When the secret is not set in the source, naming the
   * file that does not exist when reading from files.
   */
  get<K extends Required & string>(key: K): string {
    const value: string | undefined = this.#data[key];

    if (value === undefined) {
      throw new Error(
        this.#options.readMode === 'file'
          ? `Secret file "${join(this.#options.basePath, key)}" does not exist.`
          : `Secret "${key}" is not set in the environment.`,
      );
    }

    return value;
  }

  /**
   * @description Reads a resolved secret when it is set. This is the only way
   * to read an optional secret.
   *
   * @param key - Name of a required or an optional secret.
   * @returns The secret, or `undefined` when it is not set in the source. A
   * secret that is set to an empty string is returned as `''`.
   */
  getOpt<K extends (Required | Optional) & string>(key: K): string | undefined {
    return this.#data[key];
  }

  /**
   * @description Reads every secret from the configured source and resolves
   * them into the declared required and optional keys.
   *
   * @param options - Where to read the secrets from.
   * @returns A container owning the resolved secrets.
   */
  static async read<
    Required extends PropertyKey = string,
    Optional extends PropertyKey = never,
  >(options?: SecretsOptions): Promise<Secrets<Required, Optional>> {
    const config = options ?? { readMode: 'environment' };
    if (config.readMode === 'file') {
      return new Secrets<Required, Optional>(
        (await readSecretFiles(config.basePath)) as SecretsDef<
          Required,
          Optional
        >,
        config,
      );
    }
    return new Secrets<Required, Optional>(
      readEnvironment() as SecretsDef<Required, Optional>,
      config,
    );
  }
}

function readEnvironment(): Record<string, string> {
  const data: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      data[key] = value;
    }
  }

  return data;
}

async function readSecretFiles(
  basePath: string,
): Promise<Record<string, string>> {
  const files = await readdir(basePath, { withFileTypes: true });
  const data: Record<string, string> = {};

  for (const file of files) {
    if (file.isFile()) {
      data[file.name] = (
        await readFile(join(basePath, file.name), 'utf8')
      ).trim();
    }
  }

  return data;
}
