import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DailyPromptsController } from './daily-prompts.controller';
import { DailyPromptsService } from './daily-prompts.service';

@Module({
  controllers: [DailyPromptsController],
  providers: [DailyPromptsService, PrismaService],
})
export class DailyPromptsModule {}
