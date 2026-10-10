import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Secrets } from '../secrets.js';
import type { SecretsOptions } from '../secrets.js';
import { SecretsModule } from './secrets.module.js';

type AppSecrets = 'FOO' | 'BAR';

describe('SecretsModule', () => {
  afterEach(() => {
    delete process.env.FOO;
    delete process.env.BAR;
  });

  it('provides the secrets read from the environment', async () => {
    process.env.FOO = 'foo';
    process.env.BAR = '42';

    const moduleRef = await Test.createTestingModule({
      imports: [SecretsModule.forRoot({ readMode: 'environment' })],
    }).compile();

    const secrets = moduleRef.get<Secrets<AppSecrets>>(Secrets);

    expect(secrets.get('FOO')).toBe('foo');
    expect(secrets.get('BAR')).toBe('42');

    await moduleRef.close();
  });

  it('reads the environment when no options are given', async () => {
    process.env.FOO = 'foo';

    const moduleRef = await Test.createTestingModule({
      imports: [SecretsModule.forRoot()],
    }).compile();

    expect(moduleRef.get<Secrets<AppSecrets>>(Secrets).get('FOO')).toBe('foo');

    await moduleRef.close();
  });

  it('reads the secrets from the files under the configured basePath', async () => {
    const basePath = await mkdtemp(join(tmpdir(), 'secrets-nest-'));
    try {
      await writeFile(join(basePath, 'FOO'), 'foo\n');
      await writeFile(join(basePath, 'BAR'), 'bar');

      const moduleRef = await Test.createTestingModule({
        imports: [SecretsModule.forRoot({ readMode: 'file', basePath })],
      }).compile();

      const secrets = moduleRef.get<Secrets<AppSecrets>>(Secrets);

      expect(secrets.get('FOO')).toBe('foo');
      expect(secrets.get('BAR')).toBe('bar');

      await moduleRef.close();
    } finally {
      await rm(basePath, { recursive: true, force: true });
    }
  });

  it('resolves the options from an injected provider', async () => {
    const basePath = await mkdtemp(join(tmpdir(), 'secrets-nest-'));
    try {
      await writeFile(join(basePath, 'FOO'), 'foo\n');

      const OPTIONS = Symbol('OPTIONS');

      @Module({
        providers: [
          { provide: OPTIONS, useValue: { readMode: 'file', basePath } },
        ],
        exports: [OPTIONS],
      })
      class OptionsModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [
          SecretsModule.forRootAsync({
            imports: [OptionsModule],
            inject: [OPTIONS],
            useFactory: (options: SecretsOptions) => options,
          }),
        ],
      }).compile();

      expect(moduleRef.get<Secrets<AppSecrets>>(Secrets).get('FOO')).toBe(
        'foo',
      );

      await moduleRef.close();
    } finally {
      await rm(basePath, { recursive: true, force: true });
    }
  });

  it('injects the same instance into a consumer that imports the module', async () => {
    process.env.FOO = 'foo';

    @Injectable()
    class ConsumerService {
      constructor(readonly secrets: Secrets<AppSecrets>) {}
    }

    @Module({
      imports: [SecretsModule.forRoot({ readMode: 'environment' })],
      providers: [ConsumerService],
    })
    class ConsumerModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [ConsumerModule],
    }).compile();

    const consumer = moduleRef.get<ConsumerService>(ConsumerService);

    expect(consumer.secrets.get('FOO')).toBe('foo');
    expect(consumer.secrets).toBe(moduleRef.get<Secrets<AppSecrets>>(Secrets));

    await moduleRef.close();
  });
});
