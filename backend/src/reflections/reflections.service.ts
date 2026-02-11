import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMeetReflectionDto } from './dto/create-meet-reflection.dto';

@Injectable()
export class ReflectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReflection(dto: CreateMeetReflectionDto) {
    await this.prisma.meetReflection.create({
      data: {
        meetId: dto.meet_id,
        userId: dto.user_id,
        vibeScore: dto.vibe_score,
        meetOutcome: dto.meet_outcome,
        feedbackTags: dto.feedback_tags,
      },
    });

    return { success: true };
  }
}
