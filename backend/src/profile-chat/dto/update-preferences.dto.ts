import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

const preferenceLevels = ['low', 'medium', 'high'] as const;

export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(preferenceLevels)
  depth?: (typeof preferenceLevels)[number];

  @IsOptional()
  @IsIn(preferenceLevels)
  frequency?: (typeof preferenceLevels)[number];

  @IsOptional()
  @IsIn(preferenceLevels)
  directness?: (typeof preferenceLevels)[number];

  @IsOptional()
  @IsIn(preferenceLevels)
  humor?: (typeof preferenceLevels)[number];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  offLimits?: string[];
}
