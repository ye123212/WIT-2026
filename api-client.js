/**
 * @typedef {Object} ApiClient
 * @property {(payload: {meet_id:string,user_id:string,vibe_score:number,meet_outcome:'again'|'maybe'|'pass',feedback_tags:string[]}) => Promise<{success:boolean}>} submitMeetReflection
 * @property {(payload: {prompt_id:string,user_id:string,answer:string}) => Promise<{success:boolean}>} submitDailyPromptAnswer
 * @property {(payload: {user_id:string,intent:string}) => Promise<{success:boolean}>} submitWeeklyIntent
 * @property {(userId: string) => Promise<{user_id:string,score:number,cooldown_applied:boolean}>} getTrustScore
 * @property {(userId: string, linkedUserId: string) => Promise<{success:boolean}>} linkUsers
 * @property {(userId: string) => Promise<{userId:string,connections:string[]}>} getUserConnections
 */

/**
 * @param {{baseUrl?: string, fallback?: Partial<ApiClient>, useNetwork?: boolean}} options
 * @returns {ApiClient}
 */
function createApiClient(options = {}) {
  const baseUrl = options.baseUrl || '/api';
  const fallback = options.fallback || {};
  const useNetwork = options.useNetwork !== false;

  async function request(path, init) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...init
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        console.warn(`API fallback for ${path}:`, error.message);
      }
      throw error;
    }
  }

  return {
    async submitMeetReflection(payload) {
      if (useNetwork) {
        try {
          return await request('/meet_reflections', {
          method: 'POST',
          body: JSON.stringify(payload)
          });
        } catch {
          if (fallback.submitMeetReflection) return fallback.submitMeetReflection(payload);
          return { success: false };
        }
      }
      if (fallback.submitMeetReflection) return fallback.submitMeetReflection(payload);
      return { success: false };
    },

    async submitDailyPromptAnswer(payload) {
      if (useNetwork) {
        try {
          return await request('/daily_prompts/answers', {
          method: 'POST',
          body: JSON.stringify(payload)
          });
        } catch {
          if (fallback.submitDailyPromptAnswer) return fallback.submitDailyPromptAnswer(payload);
          return { success: false };
        }
      }
      if (fallback.submitDailyPromptAnswer) return fallback.submitDailyPromptAnswer(payload);
      return { success: false };
    },

    async submitWeeklyIntent(payload) {
      if (useNetwork) {
        try {
          return await request('/weekly_intent', {
          method: 'POST',
          body: JSON.stringify(payload)
          });
        } catch {
          if (fallback.submitWeeklyIntent) return fallback.submitWeeklyIntent(payload);
          return { success: false };
        }
      }
      if (fallback.submitWeeklyIntent) return fallback.submitWeeklyIntent(payload);
      return { success: false };
    },

    async getTrustScore(userId) {
      if (useNetwork) {
        try {
          return await request(`/trust_score/${encodeURIComponent(userId)}`, { method: 'GET' });
        } catch {
          if (fallback.getTrustScore) return fallback.getTrustScore(userId);
          return { user_id: userId, score: 50, cooldown_applied: false };
        }
      }
      if (fallback.getTrustScore) return fallback.getTrustScore(userId);
      return { user_id: userId, score: 50, cooldown_applied: false };
    },

    async linkUsers(userId, linkedUserId) {
      const payload = { userId, linkedUserId };
      if (useNetwork) {
        try {
          return await request('/user-connections/link', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
        } catch {
          if (fallback.linkUsers) return fallback.linkUsers(userId, linkedUserId);
          return { success: false };
        }
      }
      if (fallback.linkUsers) return fallback.linkUsers(userId, linkedUserId);
      return { success: false };
    },

    async getUserConnections(userId) {
      if (useNetwork) {
        try {
          return await request(`/user-connections/${encodeURIComponent(userId)}`, { method: 'GET' });
        } catch {
          if (fallback.getUserConnections) return fallback.getUserConnections(userId);
          return { userId, connections: [] };
        }
      }
      if (fallback.getUserConnections) return fallback.getUserConnections(userId);
      return { userId, connections: [] };
    }
  };
}

window.createApiClient = createApiClient;
