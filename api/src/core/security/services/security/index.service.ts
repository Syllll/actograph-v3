import { Injectable, BadRequestException } from '@nestjs/common';
import { KeyTestor } from '../key-testor';
import axios from 'axios';
import { Electron } from './electron';
import { LicenseService } from '../license/license.service';
import { licenseServerErrorToException } from '../license-server-error';
import { parseLicenseResponse } from '../license-response';

interface LicenseOwner {
  id: number;
  username: string;
  email: string;
  gender: string;
  firstName: string;
  lastName: string;
}

export interface LicenseResponse {
  id: number;
  type: string;
  dateMode: string;
  startDate: string;
  endDate: string | null;
  duration: number | null;
  hasTimeLimit: boolean;
  owner: LicenseOwner | null;
  renewable: boolean;
  key?: string;
}

@Injectable()
export class SecurityService {
  private readonly _keyTestor = new KeyTestor();
  public readonly electron: Electron;

  constructor(private readonly licenseService: LicenseService) {
    this.electron = new Electron({
      securityService: this,
      licenseService: this.licenseService,
    });
  }

  public async checkKeyOnActoGraphWebsiteServer(
    key: string,
  ): Promise<LicenseResponse> {
    let response: any;
    try {
      response = await axios.post(
        `${process.env.ACTOGRAPH_API}/license`,
        {
          key: key,
          password: process.env.ACTOGRAPH_API_PASSWORD,
        },
        { timeout: 10_000 },
      );
    } catch (error: unknown) {
      throw licenseServerErrorToException(error);
    }
    return parseLicenseResponse(response.data);
  }

  public async checkKeyChecksum(key: string): Promise<boolean> {
    const check = this._keyTestor.checkKeyChecksum(key);
    if (!check) {
      throw new BadRequestException('Invalid key checksum');
    }
    return true;
  }
}
