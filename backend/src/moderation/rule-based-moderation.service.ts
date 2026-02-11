import { Injectable } from '@nestjs/common';

const BLOCKED_TERMS = ['hate', 'kill yourself', 'slur'];

@Injectable()
export class RuleBasedModerationService {
  moderateMessage(message: string) {
    const lower = message.toLowerCase();
    const matches = BLOCKED_TERMS.filter((term) => lower.includes(term));

    return {
      allowed: matches.length === 0,
      reasons: matches,
      severity: matches.length > 0 ? 'high' : 'none',
    };
  }
}
