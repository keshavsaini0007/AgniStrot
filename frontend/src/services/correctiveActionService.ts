import { correctiveActionRepository } from '@/repositories';
import type { CorrectiveAction, CorrectiveCloseout, FilterParams, PaginatedResponse } from '@/types';

export const correctiveActionService = {
  getCorrectiveActions: async (params?: FilterParams): Promise<PaginatedResponse<CorrectiveAction>> => {
    return await correctiveActionRepository.getCorrectiveActions(params);
  },

  getCorrectiveActionById: async (id: string): Promise<CorrectiveAction> => {
    return await correctiveActionRepository.getCorrectiveActionById(id);
  },

  createCorrectiveAction: async (data: Omit<CorrectiveAction, 'id' | 'createdAt' | 'updatedAt'>): Promise<CorrectiveAction> => {
    return await correctiveActionRepository.createCorrectiveAction(data);
  },

  updateCorrectiveAction: async (id: string, data: Partial<CorrectiveAction>): Promise<CorrectiveAction> => {
    return await correctiveActionRepository.updateCorrectiveAction(id, data);
  },

  // ── Feature 08: close-out loop ─────────────────────────────────────────
  submitCloseout: async (
    id: string,
    input: { recommendation: string; effectiveness: string; evidenceNote?: string }
  ): Promise<CorrectiveCloseout | null> => {
    return await correctiveActionRepository.submitCloseout(id, input);
  },

  approveCloseout: async (id: string, reviewNote?: string): Promise<CorrectiveCloseout | null> => {
    return await correctiveActionRepository.approveCloseout(id, reviewNote);
  },

  rejectCloseout: async (id: string, reviewNote?: string): Promise<CorrectiveCloseout | null> => {
    return await correctiveActionRepository.rejectCloseout(id, reviewNote);
  },
};