import { Body, Controller, Post } from '@nestjs/common';
import { CreateDailyPromptAnswerDto } from './dto/create-daily-prompt-answer.dto';
import { DailyPromptsService } from './daily-prompts.service';

@Controller('daily_prompts')
export class DailyPromptsController {
  constructor(private readonly dailyPromptsService: DailyPromptsService) {}

  @Post('answers')
  answer(@Body() dto: CreateDailyPromptAnswerDto) {
    return this.dailyPromptsService.saveAnswer(dto);
  }
}
