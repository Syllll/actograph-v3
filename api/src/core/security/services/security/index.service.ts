import {
    Injectable,
    BadRequestException,
    NotFoundException,
    InternalServerErrorException,
  } from '@nestjs/common';
  import { KeyTestor } from '../key-testor';
  import * as os from 'os';
import { getMode } from 'config/mode';
import axios from 'axios';
import { getConfigPath } from 'config/path';
import * as fs from 'fs';
import * as path from 'path';
import { Electron } from './electron';
import { LicenseService } from '../license/license.service';

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
  endDate: string;
  duration: number;
  hasTimeLimit: boolean;
  owner: LicenseOwner;
  renewable: boolean;
  key?: string;
}

@Injectable()
export class SecurityService {
  private readonly _keyTestor = new KeyTestor();
  public readonly electron: Electron;

  constructor(
    private readonly licenseService: LicenseService,
  ) {
    this.electron = new Electron({
      securityService: this,
      licenseService: this.licenseService,
    });
  }

  public async checkKeyOnActoGraphWebsiteServer(key: string): Promise<LicenseResponse> {
    let response: any;
    try {
      response = await axios.post(`${process.env.ACTOGRAPH_API}/license`, {
        key: key,
      password: process.env.ACTOGRAPH_API_PASSWORD
    });
    } catch (error: any) {
      // If the server do not respond, return server not available
      if (error.response.status === 502) {
        throw new BadRequestException('Server not available');
      } else if (error.response.status === 401) {
        throw new BadRequestException('Invalid key');
      } else if (error.response.status === 404) {
        throw new BadRequestException('Page not accessible');
      } else {
        throw new BadRequestException('Unknown error when checking licence.');
      }
    }
    const responseData = response.data;
    if (responseData.message) {
      throw new BadRequestException(responseData.message ?? 'Unknown error when checking licence');
    }

    return responseData;
  }

  public async checkKeyChecksum(key: string): Promise<boolean> {
    const check = this._keyTestor.checkKeyChecksum(key);
    if (!check) {
      throw new BadRequestException('Invalid key checksum');
    }
    return true;
  }

  public async checkKey(key: string): Promise<boolean> {
    const check = this._keyTestor.checkKey(key);
    if (!check) {
      throw new BadRequestException('Invalid key');
    }

    return true;
  }
}