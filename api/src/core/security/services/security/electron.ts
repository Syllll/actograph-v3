import { InternalServerErrorException } from '@nestjs/common';
import { LicenseResponse, SecurityService } from './index.service';
import { getConfigPath } from 'config/path';
import * as fs from 'fs';
import * as path from 'path';
import { getMode } from 'config/mode';
import * as os from 'os';
import { LicenseService } from '../license/license.service';
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

    try {
      // Try to fetch a reliable external resource
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      // If fetch fails, we assume there's no internet connection
      return false;
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
    // If we don't have an internet connection, we can't check the license
    if (!hasInternetConnection) {
      const license = await this._licenseService.findEnabledLicenseByUserId(
        options.userId,
      );
      if (!license) {
        throw new InternalServerErrorException('No license found.');
      }

      const r = license.isValid();
      if (!r.valid) {
        throw new InternalServerErrorException(`Invalid license: ${r.message}`);
      }

      return license;
    }
    // If we have an internet connection, we can check the license
    else {
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
    }
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
