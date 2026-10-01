import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import axios from 'axios';
import { getConfigPath } from 'config/path';
import { KeyTestor } from '../key-testor';
import { LicenseService } from '../license/license.service';
import { SecurityService } from './index.service';

jest.mock('config/mode', () => ({ getMode: () => 'electron' }));
jest.mock('config/path', () => ({ getConfigPath: jest.fn() }));

describe('desktop license activation', () => {
  let folder: string;
  let security: SecurityService;
  let remote: jest.SpyInstance;

  beforeEach(async () => {
    folder = await fs.mkdtemp(path.join(os.tmpdir(), 'actograph-activation-'));
    (getConfigPath as jest.Mock).mockResolvedValue(folder);
    await fs.writeFile(path.join(folder, 'access.json'), '{"type":"student"}');
    security = new SecurityService({} as LicenseService);
    jest.spyOn(KeyTestor.prototype, 'checkKeyChecksum').mockReturnValue(true);
    jest.spyOn(KeyTestor.prototype, 'checkKey').mockReturnValue(true);
    remote = jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        id: 1,
        type: 'ultimate',
        dateMode: 'duration',
        startDate: '2026-09-01',
        endDate: null,
        duration: 365,
        hasTimeLimit: true,
        renewable: false,
        owner: null,
      },
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(folder, { recursive: true, force: true });
  });

  test('a production verifier rejection preserves access and skips the remote call', async () => {
    jest.spyOn(KeyTestor.prototype, 'checkKey').mockReturnValue(false);
    await expect(security.electron.activateLicense('KEY')).rejects.toThrow(
      'Invalid key',
    );
    expect(remote).not.toHaveBeenCalled();
    expect(
      JSON.parse(await fs.readFile(path.join(folder, 'access.json'), 'utf8')),
    ).toEqual({ type: 'student' });
  });

  test('a malformed remote response preserves the previous access', async () => {
    remote.mockResolvedValue({ data: {} });
    await expect(security.electron.activateLicense('KEY')).rejects.toThrow(
      'Invalid license server response',
    );
    expect(
      JSON.parse(await fs.readFile(path.join(folder, 'access.json'), 'utf8')),
    ).toEqual({ type: 'student' });
  });

  test('writes access only after local and remote validation succeed', async () => {
    await expect(security.electron.activateLicense('KEY')).resolves.toBe(true);
    expect(KeyTestor.prototype.checkKey).toHaveBeenCalledWith('KEY');
    expect(remote).toHaveBeenCalled();
    expect(
      JSON.parse(await fs.readFile(path.join(folder, 'access.json'), 'utf8')),
    ).toEqual({ type: 'license', key: 'KEY' });
  });
});
