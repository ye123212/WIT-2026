import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWeeklyIntentDto {
  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @IsString()
  @IsNotEmpty()
  intent!: string;
}
