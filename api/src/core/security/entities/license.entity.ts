import { InternalServerErrorException } from '@nestjs/common';
import { User } from '@users/entities/user.entity';
import { BaseEntity } from '@utils/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

export enum LicenseTypeEnum {
  Student = 'Student',
  Ultimate = 'Ultimate',
  Support = 'Support',
}

export enum DateModeEnum {
  Duration = 'Duration',
  Date = 'Date',
}

@Entity('licenses')
export class License extends BaseEntity {
  @Column({
    enum: LicenseTypeEnum,
    nullable: false,
  })
  type!: LicenseTypeEnum;

  @Column({
    enum: DateModeEnum,
    nullable: false,
  })
  dateMode!: DateModeEnum;

  @Column({ type: 'date', nullable: false })
  startDate!: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date | null;

  @Column({ type: 'integer', nullable: true })
  duration?: number | null;

  @Column({ nullable: false, default: true })
  hasTimeLimit!: boolean;

  @Column({ type: 'boolean', nullable: true })
  renewable?: boolean | null;

  @Column({ nullable: false })
  actographWebsiteId!: number;

  /*
   * The owner of the license is the user who has purchased the license.
   * This is the user who will be able to use the license.
   *
   * {
   *     id: number;
   *     username: string;
   *     email: string;
   *     gender: string;
   *     firstName: string;
   *     lastName: string;
   * }
   */
  @Column({ type: 'text', nullable: true })
  owner?: string | null;

  /**
   * The user who has the license in this instance of the application
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  user?: User | null;

  /**
   * If the license is enabled, it means that the license is valid and the user can use the application
   */
  @Column({ nullable: false, default: false })
  enabled!: boolean;

  /**
   * Check if the license is valid
   * @returns {boolean}
   */
  isValid(): {
    valid: boolean;
    message?: string;
  } {
    if (this.hasTimeLimit) {
      const now = new Date();

      if (this.startDate > now) {
        return { valid: false, message: 'The license has not started yet' };
      }

      if (this.dateMode === DateModeEnum.Duration) {
        if (this.duration === null || this.duration === undefined) {
          throw new InternalServerErrorException('The license has no duration');
        }

        const endDate = new Date(this.startDate);
        endDate.setDate(endDate.getDate() + this.duration);
        const valid = endDate > now;
        return {
          valid,
          message: valid ? undefined : 'The license has expired',
        };
      } else {
        if (this.endDate === null || this.endDate === undefined) {
          throw new InternalServerErrorException('The license has no end date');
        }

        if (this.startDate > this.endDate) {
          throw new InternalServerErrorException(
            'The start date is after the end date',
          );
        }

        const valid = this.endDate > now;
        return {
          valid,
          message: valid ? undefined : 'The license has expired',
        };
      }
    } else {
      return { valid: true };
    }
  }
}
