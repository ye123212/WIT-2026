import { Controller, Get, Param } from '@nestjs/common';
import { TrustScoreService } from './trust-score.service';

@Controller('trust_score')
export class TrustScoreController {
  constructor(private readonly trustScoreService: TrustScoreService) {}

  @Get(':userId')
  getByUserId(@Param('userId') userId: string) {
    return this.trustScoreService.getTrustScore(userId);
  }
}
