import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Secrets } from './secrets.js';

type AppSecrets = {
  FOO: string;
  BAR: string;
};

describe('Secrets', () => {
  afterEach(() => {
    delete process.env.FOO;
    delete process.env.BAR;
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

  it('throws when a secret is not set in the environment', async () => {
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

  it('exposes the whole source when no shape is given', async () => {
    process.env.FOO = 'foo';

    const secrets = await Secrets.read();

    expect(secrets.get('FOO')).toBe('foo');
  });

  it('rejects a shape that is not a record of strings', () => {
    // @ts-expect-error - every secret is a string
    void Secrets.read<{ FOO: number }>();
  });
});
