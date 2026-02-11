import { Module } from '@nestjs/common';
import { RuleBasedModerationService } from './rule-based-moderation.service';

@Module({
  providers: [RuleBasedModerationService],
  exports: [RuleBasedModerationService],
})
export class ModerationModule {}
