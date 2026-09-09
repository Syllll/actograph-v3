import { InternalServerErrorException } from '@nestjs/common';
import { SecurityService } from './index.service';
import { getConfigPath } from 'config/path';
import * as fs from 'fs';
import * as path from 'path';
import { getMode } from 'config/mode';
import * as os from 'os';
import { LicenseService } from '../license/license.service';
import { isLicenseServerUnreachable } from '../license-server-error';
import {
  DateModeEnum,
  License,
  LicenseTypeEnum,
} from '@core/security/entities/license.entity';

export class Electron {
  private readonly _securityService: SecurityService;
  private readonly _licenseService: LicenseService;

  constructor(options: {
    securityService: SecurityService;
    licenseService: LicenseService;
  }) {
    this._securityService = options.securityService;
    this._licenseService = options.licenseService;
  }

  /**
   * This function is called when the application is started.
   * It determines the next step for the access process.
   * @returns {Promise<{
   *   nextStep: 'choose-access-type' | 'use-student-access' | 'use-license-access',
   *   message?: string,
   *   key?: string,
   * }>}
   */
  public async determineAccessFirstStep(): Promise<{
    nextStep:
      | 'choose-access-type'
      | 'use-student-access'
      | 'use-license-access';
    message?: string;
    key?: string;
  }> {
    // We just started the application.

    const mode = getMode();
    if (mode !== 'electron') {
      throw new InternalServerErrorException(
        'Local user is only available in electron mode',
      );
    }

    // Do we have an access file in the config folder?
    const configPath = await getConfigPath();
    const accessFilePath = path.join(configPath, 'access.json');
    const hasAccessFile = fs.existsSync(accessFilePath);

    // If we do, we need to check if the license is valid
    if (hasAccessFile) {
      // Read the access file using fs.promises
      const accessFile = await fs.promises.readFile(accessFilePath, 'utf8');
      const accessFileData = JSON.parse(accessFile);

      const type = accessFileData.type;
      if (type === 'student') {
        return {
          nextStep: 'use-student-access',
          message: 'Use free student access.',
        };
      } else if (type === 'license') {
        const key = accessFileData.key;
        if (!key) {
          throw new InternalServerErrorException(
            'No key found in the access file.',
          );
        }

        return {
          nextStep: 'use-license-access',
          message: 'Use license access.',
          key,
        };
      } else {
        throw new InternalServerErrorException(`Invalid access type: ${type}`);
      }
    } else {
      // If we don't, we need the user to choose an access type
      return {
        nextStep: 'choose-access-type',
        message: 'No access file found. Please choose an access type.',
      };
    }
  }

  /**
   * Checks if the application has an active internet connection
   * @returns {Promise<boolean>} True if internet connection is available, false otherwise
   */
  public async checkInternetConnection(): Promise<boolean> {
    const mode = getMode();
    if (mode !== 'electron') {
      throw new InternalServerErrorException(
        'Local user is only available in electron mode',
      );
    }

    const apiBase = (process.env.ACTOGRAPH_API || '').replace(/\/$/, '');
    if (!apiBase) {
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      // Probe the licence host, not a third-party site (Google can be blocked
      // while ActoGraph is reachable, and the reverse is also common).
      // Any HTTP response means the host is reachable — 401/404 still count as online.
      // GET rather than HEAD: some licence hosts reject HEAD and would look
      // offline even though POST /license works. Abort at 5s limits the cost.
      await fetch(apiBase, {
        method: 'GET',
        signal: controller.signal,
      });
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public getLocalUsername(): string {
    const mode = getMode();
    if (mode !== 'electron') {
      throw new InternalServerErrorException(
        'Local user is only available in electron mode',
      );
    }

    const user = os.userInfo();
    const localUsername = `_pc-${user.username}`;
    return localUsername;
  }

  public async checkLicenseFromLicenseFile(options: {
    userId: number;
  }): Promise<License> {
    const mode = getMode();
    if (mode !== 'electron') {
      throw new InternalServerErrorException(
        'Local user is only available in electron mode',
      );
    }

    const configPath = await getConfigPath();
    const licensePath = path.join(configPath, 'access.json');
    const licenseFile = await fs.promises.readFile(licensePath, 'utf8');
    const licenseFileData = JSON.parse(licenseFile);
    const type = licenseFileData.type;
    if (type !== 'license') {
      throw new InternalServerErrorException('Invalid access type.');
    }

    const hasInternetConnection = await this.checkInternetConnection();
    if (!hasInternetConnection) {
      return this.loadStoredLicenseOrThrow(options.userId);
    }

    try {
      const key = licenseFileData.key;
      const responseData =
        await this._securityService.checkKeyOnActoGraphWebsiteServer(key);

      const license = await this._licenseService.updateOrCreateAndEnableLicense(
        {
          userId: options.userId,
          type: <LicenseTypeEnum>responseData.type,
          dateMode: <DateModeEnum>responseData.dateMode,
          startDate: new Date(responseData.startDate),
          endDate: new Date(responseData.endDate),
          duration: responseData.duration,
          hasTimeLimit: responseData.hasTimeLimit,
          renewable: responseData.renewable,
          actographWebsiteId: responseData.id,
          owner: JSON.stringify(responseData.owner),
        },
      );

      const r = license.isValid();
      if (!r.valid) {
        throw new InternalServerErrorException(`Invalid license: ${r.message}`);
      }

      return license;
    } catch (error: unknown) {
      if (isLicenseServerUnreachable(error)) {
        return this.loadStoredLicenseOrThrow(options.userId);
      }
      throw error;
    }
  }

  private async loadStoredLicenseOrThrow(userId: number): Promise<License> {
    const license = await this._licenseService.findEnabledLicenseByUserId(
      userId,
    );
    if (!license) {
      throw new InternalServerErrorException(
        'No internet connection and no license found on your computer.',
      );
    }

    const r = license.isValid();
    if (!r.valid) {
      throw new InternalServerErrorException(
        `No internet connection and the license on your computer is invalid: ${r.message}`,
      );
    }

    return license;
  }

  public async activateLicense(key: string): Promise<boolean> {
    const mode = getMode();
    if (mode !== 'electron') {
      throw new InternalServerErrorException(
        'Local user is only available in electron mode',
      );
    }

    await this._securityService.checkKeyChecksum(key);
    await this._securityService.checkKey(key);
    const responseData =
      await this._securityService.checkKeyOnActoGraphWebsiteServer(key);

    const configPath = await getConfigPath();

    const accessContent = {
      type: 'license',
      key: key,
    };

    // Save the response data in a license.json file
    const accessPath = path.join(configPath, 'access.json');
    await fs.promises.writeFile(
      accessPath,
      JSON.stringify(accessContent, null, 2),
    );

    return true;
  }

  public async resetAccess(): Promise<boolean> {
    const mode = getMode();
    if (mode !== 'electron') {
      throw new InternalServerErrorException(
        'Local user is only available in electron mode',
      );
    }

    const configPath = await getConfigPath();
    const accessFilePath = path.join(configPath, 'access.json');

    if (fs.existsSync(accessFilePath)) {
      await fs.promises.unlink(accessFilePath);
    }

    return true;
  }

  public async activateStudent(): Promise<boolean> {
    const mode = getMode();
    if (mode !== 'electron') {
      throw new InternalServerErrorException(
        'Local user is only available in electron mode',
      );
    }

    const configPath = await getConfigPath();
    const accessFilePath = path.join(configPath, 'access.json');

    const accessContent = {
      type: 'student',
    };

    await fs.promises.writeFile(
      accessFilePath,
      JSON.stringify(accessContent, null, 2),
    );

    return true;
  }
}
