import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getConfigPath } from '../config/path';
import { writeAccessFile } from './core/security/services/access-file';

jest.mock('../config/mode', () => ({ getMode: () => 'electron' }));

test('preserves legacy access when Electron supplies a different userData directory', async () => {
  const folder = await fs.mkdtemp(
    path.join(os.tmpdir(), 'actograph-path-test-'),
  );
  const previousArgv = process.argv;
  const previousProd = process.env.PROD;
  const previousXdg = process.env.XDG_CONFIG_HOME;
  const home = jest.spyOn(os, 'homedir').mockReturnValue(folder);
  try {
    process.env.PROD = 'true';
    process.env.XDG_CONFIG_HOME = path.join(folder, 'legacy');
    process.argv = [
      'node',
      'main',
      '--subprocess',
      '3236',
      '.env',
      path.join(folder, 'electron'),
    ];
    const legacy = path.join(process.env.XDG_CONFIG_HOME, 'actograph');
    await fs.mkdir(legacy, { recursive: true });
    await writeAccessFile(path.join(legacy, 'access.json'), {
      type: 'license',
      key: 'LEGACY-KEY',
    });
    const destination = await getConfigPath();
    expect(destination).toBe(process.argv[5]);
    expect(
      JSON.parse(
        await fs.readFile(path.join(destination, 'access.json'), 'utf8'),
      ),
    ).toEqual({ type: 'license', key: 'LEGACY-KEY' });
    await writeAccessFile(path.join(destination, 'access.json'), {
      type: 'student',
    });
    await getConfigPath();
    expect(
      JSON.parse(
        await fs.readFile(path.join(destination, 'access.json'), 'utf8'),
      ),
    ).toEqual({ type: 'student' });
    await fs.unlink(path.join(destination, 'access.json'));
    await getConfigPath();
    await expect(
      fs.access(path.join(destination, 'access.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    expect(
      await fs.readFile(path.join(legacy, 'access.json'), 'utf8'),
    ).toContain('LEGACY-KEY');
  } finally {
    home.mockRestore();
    process.argv = previousArgv;
    if (previousProd === undefined) delete process.env.PROD;
    else process.env.PROD = previousProd;
    if (previousXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = previousXdg;
    await fs.rm(folder, { recursive: true, force: true });
  }
});
