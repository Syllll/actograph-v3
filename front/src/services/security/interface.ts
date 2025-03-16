export enum LicenseTypeEnum {
  Student = 'Student',
  Ultimate = 'Ultimate',
  Support = 'Support',
}

export enum DateModeEnum {
  Duration = 'Duration',
  Date = 'Date',
}

export interface ILicense {
  id: number;
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
  enabled: boolean;
}
