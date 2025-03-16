import {
  DateModeEnum,
  License,
  LicenseTypeEnum,
} from '@core/security/entities/license.entity';
import { LicenseRepository } from '@core/security/repositories/license.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';

@Injectable()
export class LicenseService extends BaseService<License, LicenseRepository> {
  constructor(
    @InjectRepository(LicenseRepository)
    private readonly licenseRepository: LicenseRepository,
  ) {
    super(licenseRepository);
  }

  async findEnabledLicenseByUserId(userId: number): Promise<License | null> {
    return await this.licenseRepository.findOne({
      where: {
        user: { id: userId },
        enabled: true,
      },
    });
  }

  /**
   * Update or create a license and link it to a user.
   * @param options
   * @param options.userId - The id of the user to link the license to
   * @param options.type - The type of the license
   * @param options.dateMode - The date mode of the license
   * @param options.startDate - The start date of the license
   * @param options.endDate - The end date of the license
   * @param options.duration - The duration of the license
   * @param options.hasTimeLimit - Whether the license has a time limit
   * @param options.renewable - Whether the license is renewable
   * @param options.owner - The owner of the license
   * @param options.actographWebsiteId - The id of the license on the actograph website
   * @returns The license
   */
  public async updateOrCreateAndEnableLicense(options: {
    userId: number;
    type: LicenseTypeEnum;
    dateMode: DateModeEnum;
    startDate: Date;
    endDate: Date;
    duration: number;
    hasTimeLimit: boolean;
    renewable: boolean;
    owner: string;
    actographWebsiteId: number;
  }) {
    const license = await this.licenseRepository.findOne({
      where: {
        actographWebsiteId: options.actographWebsiteId,
      },
    });

    // Disable all licenses
    // We do this because the user can only have one license at a time
    // The enabled license is the one that will be used by the application
    // It will be enabled in the following code
    await this.licenseRepository.update(
      {
        user: {
          id: options.userId,
        },
      },
      { enabled: false },
    );

    // Now, we will update or create the license
    // And enable it in the process

    // If the license exists, we update it
    if (license) {
      license.type = options.type;
      license.dateMode = options.dateMode;
      license.startDate = options.startDate;
      license.endDate = options.endDate;
      license.duration = options.duration;
      license.hasTimeLimit = options.hasTimeLimit;
      license.renewable = options.renewable;
      license.owner = options.owner;
      license.enabled = true;
      license.user = <any>{
        id: options.userId,
      };
      return await this.licenseRepository.save(license);
    }

    // If the license does not exist, we create it
    return await this.createAndLinkToUser({
      ...options,
      userId: options.userId,
    });
  }

  private async createAndLinkToUser(options: {
    userId: number;
    type: LicenseTypeEnum;
    dateMode: DateModeEnum;
    startDate: Date;
    endDate: Date;
    duration: number;
    hasTimeLimit: boolean;
    renewable: boolean;
    owner: string;
    actographWebsiteId: number;
  }): Promise<License> {
    const license = await this.licenseRepository.create({
      type: options.type,
      dateMode: options.dateMode,
      startDate: options.startDate,
      endDate: options.endDate,
      duration: options.duration,
      hasTimeLimit: options.hasTimeLimit,
      renewable: options.renewable,
      actographWebsiteId: options.actographWebsiteId,
      owner: options.owner,
      enabled: true,
      user: {
        id: options.userId,
      },
    });

    return await this.licenseRepository.save(license);
  }
}
