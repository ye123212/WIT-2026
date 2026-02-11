import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateWeeklyIntentDto } from './dto/create-weekly-intent.dto';

@Injectable()
export class WeeklyIntentService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertIntent(dto: CreateWeeklyIntentDto) {
    await this.prisma.weeklyIntent.upsert({
      where: { userId: dto.user_id },
      update: { intent: dto.intent },
      create: { userId: dto.user_id, intent: dto.intent },
    });

    return { success: true };
  }
}
