import apiClient, { normalizeList, unwrap } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { CorrectiveAction, CorrectiveCloseout, FilterParams, PaginatedResponse } from '@/types';
import { alertApiRepository } from './alertApiRepository';

/**
 * Backend contract for /corrective-actions — a read-only, derived feed over
 * Alerts + workflow history (see backend correctiveAction.controller.ts).
 * "Create" is impossible by design (alerts are rule-generated); resolution is
 * delegated to the real alert lifecycle (POST /alerts/:id/resolve).
 */
type CorrectiveActionDto = {
  id: string;
  siteId: string;
  siteName: string;
  title: string;
  description: string;
  priority: CorrectiveAction['priority'];
  status: CorrectiveAction['status'];
  department: string;
  assignedTo: string;
  dueDate: string;
  resolutionNote?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  closeout?: {
    status: 'submitted' | 'approved' | 'rejected';
    recommendation: string;
    effectiveness: string;
    evidenceNote?: string;
    submittedBy?: string;
    submittedAt: string;
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNote?: string;
  };
  createdAt: string;
  updatedAt: string;
};

function toCorrectiveAction(d: CorrectiveActionDto): CorrectiveAction {
  return {
    id: d.id,
    observationId: d.id,
    mineId: d.siteId,
    assignedTo: d.assignedTo,
    department: d.department,
    title: d.title,
    description: d.description,
    priority: d.priority,
    dueDate: d.dueDate,
    status: d.status,
    resolutionNote: d.resolutionNote,
    verifiedBy: d.verifiedBy,
    verifiedAt: d.verifiedAt,
    closeout: d.closeout,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export const correctiveActionApiRepository = {
  getCorrectiveActions: async (params?: FilterParams): Promise<PaginatedResponse<CorrectiveAction>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CORRECTIVE_ACTIONS.BASE, {
        params: {
          siteId: params?.siteId || undefined,
          status: params?.status || undefined,
          priority: params?.severity || undefined,
          limit: params?.limit || 50,
        },
      });
      const res = normalizeList<CorrectiveActionDto>(response.data);
      return { ...res, data: res.data.map(toCorrectiveAction) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getCorrectiveActionById: async (id: string): Promise<CorrectiveAction> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CORRECTIVE_ACTIONS.DETAIL(id));
      return toCorrectiveAction(unwrap<CorrectiveActionDto>(response.data));
    } catch (error) {
      throw handleApiError(error);
    }
  },

  createCorrectiveAction: async (_data: Omit<CorrectiveAction, 'id' | 'createdAt' | 'updatedAt'>): Promise<CorrectiveAction> => {
    throw new Error('Corrective actions are rule-generated — they cannot be created manually.');
  },

  updateCorrectiveAction: async (
    id: string,
    data: Partial<Pick<CorrectiveAction, 'status' | 'resolutionNote'>>
  ): Promise<CorrectiveAction> => {
    try {
      if (data.status === 'resolved') {
        // Resolving = closing the underlying alert through the real lifecycle.
        await alertApiRepository.resolve(id, data.resolutionNote);
      }
      const current = await correctiveActionApiRepository.getCorrectiveActionById(id);
      return {
        ...current,
        status: data.status ?? current.status,
        resolutionNote: data.resolutionNote ?? current.resolutionNote,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // ── Feature 08: close-out loop (move the action to a terminal state) ──────
  submitCloseout: async (
    id: string,
    input: { recommendation: string; effectiveness: string; evidenceNote?: string }
  ): Promise<CorrectiveCloseout | null> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.CORRECTIVE_ACTIONS.CLOSE_OUT(id), input);
      return unwrap<CorrectiveCloseout>(response.data) ?? null;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  approveCloseout: async (id: string, reviewNote?: string): Promise<CorrectiveCloseout | null> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.CORRECTIVE_ACTIONS.APPROVE(id), {
        reviewNote: reviewNote || undefined,
      });
      return unwrap<CorrectiveCloseout>(response.data) ?? null;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  rejectCloseout: async (id: string, reviewNote?: string): Promise<CorrectiveCloseout | null> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.CORRECTIVE_ACTIONS.REJECT(id), {
        reviewNote: reviewNote || undefined,
      });
      return unwrap<CorrectiveCloseout>(response.data) ?? null;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};