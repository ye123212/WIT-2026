import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TrustScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrustScore(userId: string) {
    const score = await this.prisma.trustScore.findUnique({ where: { userId } });

    if (!score) {
      return { user_id: userId, score: 50, cooldown_applied: false };
    }

    return {
      user_id: score.userId,
      score: score.score,
      cooldown_applied: score.cooldownApplied,
    };
  }
}
