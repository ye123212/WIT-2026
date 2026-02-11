import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateValuesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];
}
