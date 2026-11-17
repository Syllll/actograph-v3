import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import type {
  ProtocolExchangeDocument,
  ReadingExchangeDocument,
} from '@actograph/core';

export class PreviewExchangeDto {
  @IsIn(['readings', 'protocol'])
  kind!: 'readings' | 'protocol';

  @IsIn(['add', 'replace'])
  mode!: 'add' | 'replace';

  // The versioned document has its own shared, recursive structural validator.
  @IsObject()
  document!: ReadingExchangeDocument | ProtocolExchangeDocument;
}

export class ApplyExchangeDto extends PreviewExchangeDto {
  @IsString()
  @Length(64, 64)
  revision!: string;

  @IsOptional()
  @IsBoolean()
  confirmReplace?: boolean;
}
