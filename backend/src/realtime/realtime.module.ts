import { Module } from '@nestjs/common';
import { ModerationModule } from '../moderation/moderation.module';
import { MatchGateway } from './match.gateway';

@Module({
  imports: [ModerationModule],
  providers: [MatchGateway],
})
export class RealtimeModule {}
