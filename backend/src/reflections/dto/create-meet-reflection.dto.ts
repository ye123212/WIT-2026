import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

const outcomes = ['again', 'maybe', 'pass'] as const;

export class CreateMeetReflectionDto {
  @IsUUID()
  meet_id!: string;

  @IsString()
  user_id!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  vibe_score!: number;

  @IsIn(outcomes)
  meet_outcome!: (typeof outcomes)[number];

  @IsOptional()
  @IsArray()
  @MaxLength(3)
  @IsString({ each: true })
  feedback_tags?: string[];
}
