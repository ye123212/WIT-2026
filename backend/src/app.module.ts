import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DailyPromptsModule } from './daily-prompts/daily-prompts.module';
import { QueueModule } from './queue/queue.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReflectionsModule } from './reflections/reflections.module';
import { TrustScoreModule } from './trust-score/trust-score.module';
import { UserConnectionsModule } from './user-connections/user-connections.module';
import { WeeklyIntentModule } from './weekly-intent/weekly-intent.module';
import { ProfileChatModule } from './profile-chat/profile-chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    QueueModule,
    RealtimeModule,
    ReflectionsModule,
    DailyPromptsModule,
    WeeklyIntentModule,
    TrustScoreModule,
    UserConnectionsModule,
    ProfileChatModule,
  ],
})
export class AppModule {}
