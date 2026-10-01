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
 * @description Secrets read from the configured source.
 *
 * @example
 * ```ts
 * type AppSecrets = {
 *   DB_URL: string;
 *   PORT: string;
 * };
 *
 * const secrets = await Secrets.read<AppSecrets>({ readMode: 'environment' });
 *
 * const db = new Database(secrets.get('DB_URL'));
 * ```
 */
export class Secrets<
  T extends Record<string, string> = Record<string, string>,
> {
  readonly #data: T;

  private constructor(data: T) {
    this.#data = data;
  }

  /**
   * @description Reads a resolved secret.
   *
   * @param key - Name of the secret.
   */
  get<K extends keyof T & string>(key: K): T[K] {
    return this.#data[key];
  }

  /**
   * @description Reads every secret from the configured source and resolves
   * them into the shape of `S`.
   *
   * @param options - Where to read the secrets from.
   * @returns A container owning the resolved secrets.
   */
  static async read<S extends Record<string, string> = Record<string, string>>(
    options?: SecretsOptions,
  ): Promise<Secrets<S>> {
    const config = options ?? { readMode: 'environment' };
    if (config.readMode === 'file') {
      return new Secrets<S>((await readSecretFiles(config.basePath)) as S);
    }
    return new Secrets<S>(readEnvironment() as S);
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
