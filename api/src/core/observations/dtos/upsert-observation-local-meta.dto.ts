import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { OBSERVATION_LOCAL_META_USED_FOR_VALUES } from '../entities/observation-local-meta.entity';

export class UpsertObservationLocalMetaDto {
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @IsOptional()
  @IsBoolean()
  isProtocol?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn([...OBSERVATION_LOCAL_META_USED_FOR_VALUES], { each: true })
  usedFor?: string[];

  @IsOptional()
  @IsString()
  usedForOther?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;
}
