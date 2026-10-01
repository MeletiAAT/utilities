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

  it('ignores entries that are not files', async () => {
    const basePath = await mkdtemp(join(tmpdir(), 'secrets-'));
    try {
      await writeFile(join(basePath, 'FOO'), 'foo\n');
      await mkdir(join(basePath, 'nested'));

      const secrets = await Secrets.read<Record<string, string>>({
        readMode: 'file',
        basePath,
      });

      expect(secrets.get('FOO')).toBe('foo');
      expect(secrets.get('nested')).toBeUndefined();
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
