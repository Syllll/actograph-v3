import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { writeAccessFile } from './access-file';

test('replaces access atomically and leaves no temporary file', async () => {
  const folder = await fs.mkdtemp(
    path.join(os.tmpdir(), 'actograph-access-test-'),
  );
  const file = path.join(folder, 'access.json');
  try {
    await writeAccessFile(file, { type: 'student' });
    await writeAccessFile(file, { type: 'license', key: 'KEY' });
    expect(JSON.parse(await fs.readFile(file, 'utf8'))).toEqual({
      type: 'license',
      key: 'KEY',
    });
    expect(await fs.readdir(folder)).toEqual(['access.json']);
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});
test('cleans up the temporary file if replacing access fails', async () => {
  const folder = await fs.mkdtemp(
    path.join(os.tmpdir(), 'actograph-access-test-'),
  );
  const file = path.join(folder, 'access.json');
  try {
    await fs.mkdir(file);
    await expect(writeAccessFile(file, { type: 'student' })).rejects.toThrow();
    expect(await fs.readdir(folder)).toEqual(['access.json']);
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});

test('recovers missing and damaged legacy access files through access selection', async () => {
  const { readAccessFile } = await import('./access-file');
  const folder = await fs.mkdtemp(
    path.join(os.tmpdir(), 'actograph-access-test-'),
  );
  const file = path.join(folder, 'access.json');
  try {
    expect(await readAccessFile(file)).toBeNull();
    for (const content of [
      '{',
      'null',
      '[]',
      '{}',
      '{"type":"license","key":123}',
      '{"type":"license","key":""}',
    ]) {
      await fs.writeFile(file, content);
      expect(await readAccessFile(file)).toBeNull();
    }
    await writeAccessFile(file, { type: 'license', key: 'KEY' });
    expect(await readAccessFile(file)).toEqual({ type: 'license', key: 'KEY' });
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});
