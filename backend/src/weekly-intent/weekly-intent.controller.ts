import { Body, Controller, Post } from '@nestjs/common';
import { CreateWeeklyIntentDto } from './dto/create-weekly-intent.dto';
import { WeeklyIntentService } from './weekly-intent.service';

@Controller('weekly_intent')
export class WeeklyIntentController {
  constructor(private readonly weeklyIntentService: WeeklyIntentService) {}

  @Post()
  create(@Body() dto: CreateWeeklyIntentDto) {
    return this.weeklyIntentService.upsertIntent(dto);
  }
}
