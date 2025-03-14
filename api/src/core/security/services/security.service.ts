import {
    Injectable,
    BadRequestException,
    NotFoundException,
    InternalServerErrorException,
  } from '@nestjs/common';
  import { KeyTestor } from './key-testor';
  import * as os from 'os';
import { getMode } from 'config/mode';
import axios from 'axios';
  
  @Injectable()
  export class SecurityService {
    private readonly _keyTestor = new KeyTestor();
  
    constructor(
    ) {
      
    }

    public getLocalUsername(): string {
      const mode = getMode();
      if (mode !== 'electron') {
        throw new InternalServerErrorException('Local user is only available in electron mode');
      }

      const user = os.userInfo();
      const localUsername = `_pc-${user.username}`;
      return localUsername;
    }

    public async activateLicense(key: string): Promise<boolean> {
      await this.checkKeyChecksum(key);
      await this.checkKey(key);

      const response = await axios.post(`${process.env.ACTOGRAPH_API}/license`, {
        key: key,
        password: process.env.ACTOGRAPH_API_PASSWORD
      });
      const responseData = response.data;

      if (responseData.message) {
        throw new BadRequestException(responseData.message ?? 'Unknown error when checking licence, code: sec.ser.46');
      }

      return true;
    }

    private async checkKeyChecksum(key: string): Promise<boolean> {
      const check = this._keyTestor.checkKeyChecksum(key);
      if (!check) {
        throw new BadRequestException('Invalid key checksum');
      }
      return true;
    }

    private async checkKey(key: string): Promise<boolean> {
      const check = this._keyTestor.checkKey(key);
      if (!check) {
        throw new BadRequestException('Invalid key');
      }

      return true;
    }
  }