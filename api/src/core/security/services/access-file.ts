import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';

/** Replace access.json atomically; an interrupted write preserves the old access. */
export async function writeAccessFile(
  filePath: string,
  content: { type: 'student' } | { type: 'license'; key: string },
): Promise<void> {
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(content, null, 2), {
      flag: 'wx',
      mode: 0o600,
    });
    await fs.rename(temporary, filePath);
  } finally {
    await fs.unlink(temporary).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

export type LocalAccess =
  | { type: 'student' }
  | { type: 'license'; key: string };

/** Old interrupted writes should lead back to access selection, not a stuck gateway. */
export async function readAccessFile(
  filePath: string,
): Promise<LocalAccess | null> {
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const access = data as { type?: string; key?: unknown };
  if (access.type === 'student') return { type: 'student' };
  if (
    access.type === 'license' &&
    typeof access.key === 'string' &&
    access.key.trim()
  )
    return { type: 'license', key: access.key };
  return null;
}
