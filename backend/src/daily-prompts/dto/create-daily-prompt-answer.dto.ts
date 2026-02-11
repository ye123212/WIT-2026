import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDailyPromptAnswerDto {
  @IsString()
  @IsNotEmpty()
  prompt_id!: string;

  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @IsString()
  @IsNotEmpty()
  answer!: string;
}
