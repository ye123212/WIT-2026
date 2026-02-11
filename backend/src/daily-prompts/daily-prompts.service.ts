import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDailyPromptAnswerDto } from './dto/create-daily-prompt-answer.dto';

@Injectable()
export class DailyPromptsService {
  constructor(private readonly prisma: PrismaService) {}

  async saveAnswer(dto: CreateDailyPromptAnswerDto) {
    await this.prisma.dailyPromptAnswer.create({
      data: {
        promptId: dto.prompt_id,
        userId: dto.user_id,
        answer: dto.answer,
      },
    });

    return { success: true };
  }
}
