import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WeeklyIntentController } from './weekly-intent.controller';
import { WeeklyIntentService } from './weekly-intent.service';

@Module({
  controllers: [WeeklyIntentController],
  providers: [WeeklyIntentService, PrismaService],
})
export class WeeklyIntentModule {}
