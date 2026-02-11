import { Module } from '@nestjs/common';
import { ProfileChatController } from './profile-chat.controller';
import { ProfileChatService } from './profile-chat.service';

@Module({
  controllers: [ProfileChatController],
  providers: [ProfileChatService],
})
export class ProfileChatModule {}
