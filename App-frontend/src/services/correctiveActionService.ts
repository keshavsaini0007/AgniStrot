import { correctiveActionRepository } from '@/repositories';
import type { CorrectiveAction, CorrectiveCloseout, FilterParams, PaginatedResponse } from '@/types';

export const correctiveActionService = {
  getCorrectiveActions: async (params?: FilterParams): Promise<PaginatedResponse<CorrectiveAction>> => {
    return await correctiveActionRepository.getCorrectiveActions(params);
  },
  getCorrectiveActionById: async (id: string): Promise<CorrectiveAction> => {
    return await correctiveActionRepository.getCorrectiveActionById(id);
  },
  // ── Feature 08: close-out loop ────────────────────────────────────────────
  submitCloseout: async (
    id: string,
    input: { recommendation: string; effectiveness: string; evidenceNote?: string }
  ): Promise<CorrectiveCloseout> => {
    return await correctiveActionRepository.submitCloseout(id, input);
  },
  approveCloseout: async (id: string, reviewNote?: string): Promise<CorrectiveCloseout> => {
    return await correctiveActionRepository.approveCloseout(id, reviewNote);
  },
  rejectCloseout: async (id: string, reviewNote?: string): Promise<CorrectiveCloseout> => {
    return await correctiveActionRepository.rejectCloseout(id, reviewNote);
  },
};