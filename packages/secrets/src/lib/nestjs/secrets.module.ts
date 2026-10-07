import { Module } from '@nestjs/common';
import type {
  DynamicModule,
  FactoryProvider,
  ModuleMetadata,
} from '@nestjs/common';

import { Secrets } from '../secrets.js';
import type { SecretsOptions } from '../secrets.js';

/**
 * @description Options shaping how the module is registered.
 */
export interface SecretsModuleRegistrationOptions {
  /**
   * @description Registers the module globally, so {@link Secrets} is
   * injectable without importing the module.
   *
   * @default false
   */
  isGlobal?: boolean;
}

/**
 * @description Options accepted by {@link SecretsModule.forRootAsync}.
 */
export interface SecretsModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * @description Registers the module globally, so {@link Secrets} is
   * injectable without importing the module.
   *
   * @default false
   */
  isGlobal?: boolean;
  /**
   * @description Providers injected into `useFactory`.
   */
  inject?: FactoryProvider['inject'];
  /**
   * @description Builds the options the secrets are read with.
   */
  useFactory: (...args: never[]) => SecretsOptions | Promise<SecretsOptions>;
}

/**
 * @description Nest module owning a {@link Secrets} instance read once at
 * bootstrap from the environment or from the file system.
 *
 * @example
 * ```ts
 * @Module({
 *   imports: [SecretsModule.forRoot({ readMode: 'file', basePath: '/run/secrets' })],
 * })
 * export class AppModule {}
 *
 * @Injectable()
 * export class DatabaseService {
 *   constructor(private readonly secrets: Secrets<AppSecrets>) {}
 * }
 * ```
 */
@Module({})
export class SecretsModule {
  /**
   * @description Reads the secrets described by `options` and exports them as
   * an injectable {@link Secrets} instance.
   */
  static forRoot(
    options?: SecretsOptions,
    registration?: SecretsModuleRegistrationOptions,
  ): DynamicModule {
    return {
      module: SecretsModule,
      global: registration?.isGlobal ?? false,
      providers: [
        {
          provide: Secrets,
          useFactory: () => Secrets.read(options),
        },
      ],
      exports: [Secrets],
    };
  }

  /**
   * @description Reads the secrets described by the options returned by
   * `useFactory` and exports them as an injectable {@link Secrets} instance.
   */
  static forRootAsync(options: SecretsModuleAsyncOptions): DynamicModule {
    return {
      module: SecretsModule,
      global: options.isGlobal ?? false,
      imports: options.imports ?? [],
      providers: [
        {
          provide: Secrets,
          ...(options.inject ? { inject: options.inject } : {}),
          useFactory: async (...args: never[]) =>
            Secrets.read(await options.useFactory(...args)),
        },
      ],
      exports: [Secrets],
    };
  }
}
