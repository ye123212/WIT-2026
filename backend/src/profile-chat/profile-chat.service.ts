import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConnectChatDto } from './dto/connect-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateBasicProfileDto } from './dto/update-basic-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateValuesDto } from './dto/update-values.dto';

type ProfileStore = {
  basic: Record<string, unknown>;
  preferences: Record<string, unknown>;
  values: Record<string, unknown>;
};

type ChatMessage = {
  sender: 'user';
  message: string;
  timestamp: string;
};

@Injectable()
export class ProfileChatService {
  private readonly profile: ProfileStore = {
    basic: {},
    preferences: {},
    values: {},
  };

  private readonly chatByUserId = new Map<string, string>();
  private readonly chatHistory = new Map<string, ChatMessage[]>();

  updateBasic(dto: UpdateBasicProfileDto) {
    const changedEntries = this.extractChangedEntries(this.profile.basic, dto);

    if (changedEntries.length === 0) {
      throw new BadRequestException('No changed basic profile fields provided');
    }

    for (const [field, value] of changedEntries) {
      this.profile.basic[field] = value;
    }

    return {
      status: 'ok',
      updatedFields: changedEntries.map(([field]) => field),
    };
  }

  updatePreferences(dto: UpdatePreferencesDto) {
    const changedEntries = this.extractChangedEntries(this.profile.preferences, dto);

    if (changedEntries.length === 0) {
      throw new BadRequestException('No changed preferences provided');
    }

    for (const [field, value] of changedEntries) {
      this.profile.preferences[field] = value;
    }

    return {
      status: 'ok',
      updated: true,
    };
  }

  updateValues(dto: UpdateValuesDto) {
    const changedEntries = this.extractChangedEntries(this.profile.values, dto);

    if (changedEntries.length === 0) {
      throw new BadRequestException('No changed values or interests provided');
    }

    for (const [field, value] of changedEntries) {
      this.profile.values[field] = value;
    }

    return {
      status: 'ok',
      updated: true,
    };
  }

  connectChat(dto: ConnectChatDto) {
    const existingChatId = this.chatByUserId.get(dto.userId);
    if (existingChatId) {
      return {
        chatId: existingChatId,
        status: 'connected',
      };
    }

    const chatId = randomUUID();
    this.chatByUserId.set(dto.userId, chatId);
    this.chatHistory.set(chatId, []);

    return {
      chatId,
      status: 'connected',
    };
  }

  addMessage(dto: SendMessageDto) {
    const messageHistory = this.chatHistory.get(dto.chatId);

    if (!messageHistory) {
      throw new NotFoundException('Chat not found');
    }

    messageHistory.push({
      sender: 'user',
      message: dto.message,
      timestamp: new Date().toISOString(),
    });

    return {
      chatId: dto.chatId,
      messageHistory,
    };
  }

  private extractChangedEntries<T extends object>(
    existing: Record<string, unknown>,
    updates: T,
  ): [string, unknown][] {
    return Object.entries(updates).filter(([key, value]) => {
      if (value === undefined) {
        return false;
      }

      return JSON.stringify(existing[key]) !== JSON.stringify(value);
    });
  }
}
