import { Body, Controller, Patch, Post } from '@nestjs/common';
import { ConnectChatDto } from './dto/connect-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateBasicProfileDto } from './dto/update-basic-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateValuesDto } from './dto/update-values.dto';
import { ProfileChatService } from './profile-chat.service';

@Controller()
export class ProfileChatController {
  constructor(private readonly profileChatService: ProfileChatService) {}

  @Patch('user/profile/basic')
  updateBasic(@Body() dto: UpdateBasicProfileDto) {
    return this.profileChatService.updateBasic(dto);
  }

  @Patch('user/profile/preferences')
  updatePreferences(@Body() dto: UpdatePreferencesDto) {
    return this.profileChatService.updatePreferences(dto);
  }

  @Patch('user/profile/values')
  updateValues(@Body() dto: UpdateValuesDto) {
    return this.profileChatService.updateValues(dto);
  }

  @Post('chat/connect')
  connectChat(@Body() dto: ConnectChatDto) {
    return this.profileChatService.connectChat(dto);
  }

  @Post('chat/message')
  sendMessage(@Body() dto: SendMessageDto) {
    return this.profileChatService.addMessage(dto);
  }
}
