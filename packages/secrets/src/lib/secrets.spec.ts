import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Secrets } from './secrets.js';

type AppSecrets = 'FOO' | 'BAR';

describe('Secrets', () => {
  afterEach(() => {
    delete process.env.FOO;
    delete process.env.BAR;
    delete process.env.BAZ;
  });

  it('reads string secrets from the environment', async () => {
    process.env.FOO = 'foo';
    process.env.BAR = '42';

    const secrets = await Secrets.read<AppSecrets>({ readMode: 'environment' });

    expect(secrets.get('FOO')).toBe('foo');
    expect(secrets.get('BAR')).toBe('42');
  });

  it('reads from the environment by default', async () => {
    process.env.FOO = 'foo';

    const secrets = await Secrets.read<AppSecrets>();

    expect(secrets.get('FOO')).toBe('foo');
  });

  it('throws when a required secret is not set in the environment', async () => {
    delete process.env.FOO;

    const secrets = await Secrets.read<AppSecrets>({ readMode: 'environment' });

    expect(() => secrets.get('FOO')).toThrow(
      'Secret "FOO" is not set in the environment.',
    );
  });

  it('returns empty secrets as empty strings', async () => {
    process.env.FOO = '';

    const secrets = await Secrets.read<AppSecrets>();

    expect(secrets.get('FOO')).toBe('');
  });

  it('returns the secret when it is set', async () => {
    process.env.FOO = 'foo';

    const secrets = await Secrets.read<AppSecrets>();

    expect(secrets.getOpt('FOO')).toBe('foo');
  });

  it('returns undefined when the secret is not set in the environment', async () => {
    delete process.env.FOO;

    const secrets = await Secrets.read<AppSecrets>({ readMode: 'environment' });

    expect(secrets.getOpt('FOO')).toBeUndefined();
  });

  it('returns an empty secret instead of undefined', async () => {
    process.env.FOO = '';

    const secrets = await Secrets.read<AppSecrets>();

    expect(secrets.getOpt('FOO')).toBe('');
  });

  it('returns an optional secret when it is set', async () => {
    process.env.BAZ = 'baz';

    const secrets = await Secrets.read<AppSecrets, 'BAZ'>();

    expect(secrets.getOpt('BAZ')).toBe('baz');
  });

  it('returns undefined for an optional secret that is not set', async () => {
    delete process.env.BAZ;

    const secrets = await Secrets.read<AppSecrets, 'BAZ'>();

    expect(secrets.getOpt('BAZ')).toBeUndefined();
  });

  it('throws when an optional secret is read as required', async () => {
    delete process.env.BAZ;

    const secrets = await Secrets.read<AppSecrets, 'BAZ'>();

    // @ts-expect-error - an optional secret is only reachable through getOpt
    expect(() => secrets.get('BAZ')).toThrow(
      'Secret "BAZ" is not set in the environment.',
    );
  });

  it('rejects a key that is not part of the shape', async () => {
    delete process.env.BAZ;

    const secrets = await Secrets.read<AppSecrets>();

    // @ts-expect-error - every key comes from the declared secrets
    expect(secrets.getOpt('BAZ')).toBeUndefined();
  });

  it('reads files under basePath and trims their contents', async () => {
    const basePath = await mkdtemp(join(tmpdir(), 'secrets-'));
    try {
      await writeFile(join(basePath, 'FOO'), 'foo\n');
      await writeFile(join(basePath, 'BAR'), 'bar');

      const secrets = await Secrets.read<AppSecrets>({
        readMode: 'file',
        basePath,
      });

      expect(secrets.get('FOO')).toBe('foo');
      expect(secrets.get('BAR')).toBe('bar');
    } finally {
      await rm(basePath, { recursive: true, force: true });
    }
  });

  it('throws naming the missing file when no file exists for a secret', async () => {
    const basePath = await mkdtemp(join(tmpdir(), 'secrets-'));
    try {
      await writeFile(join(basePath, 'FOO'), 'foo');
      await mkdir(join(basePath, 'BAR'));

      const secrets = await Secrets.read<AppSecrets>({
        readMode: 'file',
        basePath,
      });

      expect(secrets.get('FOO')).toBe('foo');
      expect(() => secrets.get('BAR')).toThrow(
        `Secret file "${join(basePath, 'BAR')}" does not exist.`,
      );
    } finally {
      await rm(basePath, { recursive: true, force: true });
    }
  });

  it('returns undefined when no file exists for a secret', async () => {
    const basePath = await mkdtemp(join(tmpdir(), 'secrets-'));
    try {
      await writeFile(join(basePath, 'FOO'), 'foo');

      const secrets = await Secrets.read<AppSecrets>({
        readMode: 'file',
        basePath,
      });

      expect(secrets.getOpt('FOO')).toBe('foo');
      expect(secrets.getOpt('BAR')).toBeUndefined();
    } finally {
      await rm(basePath, { recursive: true, force: true });
    }
  });

  it('exposes the whole source when no shape is given', async () => {
    process.env.FOO = 'foo';

    const secrets = await Secrets.read();

    expect(secrets.get('FOO')).toBe('foo');
  });

  it('rejects a type argument that is not a property key', () => {
    // @ts-expect-error - every secret is named by a property key
    void Secrets.read<{ FOO: number }>();
  });
});
