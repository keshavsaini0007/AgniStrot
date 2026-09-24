import { apiClient } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type {
  CorrectiveAction,
  CorrectiveCloseout,
  FilterParams,
  PaginatedResponse,
} from '@/types';

/**
 * Backend contract for /corrective-actions — a read-only, derived feed over
 * Alerts + workflow history (backend correctiveAction.controller.ts). Rows are
 * rule-generated; resolution happens through the alert lifecycle. Feature 08
 * adds the close-out writers: submit / approve / reject.
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
  closeout?: CorrectiveCloseout;
  createdAt: string;
  updatedAt: string;
};

function toCorrectiveAction(d: CorrectiveActionDto): CorrectiveAction {
  return {
    id: d.id,
    observationId: d.id,
    mineId: d.siteId,
    siteName: d.siteName,
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

function toQueryParams(params?: FilterParams): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (params?.siteId) query.siteId = params.siteId as string;
  if (params?.status) query.status = params.status as string;
  if (params?.severity) query.priority = params.severity as string;
  if (params?.limit) query.limit = params.limit as number;
  return query;
}

export const correctiveActionApiRepository = {
  getCorrectiveActions: async (params?: FilterParams): Promise<PaginatedResponse<CorrectiveAction>> => {
    try {
      const res = await apiClient.get<{ data: CorrectiveActionDto[]; total: number; limit: number }>(
        endpoints.correctiveActions.list,
        { params: toQueryParams(params) }
      );
      const rows = res.data.data ?? [];
      const total = res.data.total ?? rows.length;
      return {
        success: true,
        data: rows.map(toCorrectiveAction),
        meta: {
          page: 1,
          limit: res.data.limit ?? rows.length,
          total,
          totalPages: Math.max(1, Math.ceil(total / Math.max(1, rows.length || 1))),
        },
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getCorrectiveActionById: async (id: string): Promise<CorrectiveAction> => {
    try {
      const res = await apiClient.get<{ data: CorrectiveActionDto }>(
        endpoints.correctiveActions.detail(id)
      );
      return toCorrectiveAction(res.data.data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  createCorrectiveAction: async (): Promise<CorrectiveAction> => {
    throw new Error('Corrective actions are rule-generated — they cannot be created manually.');
  },

  updateCorrectiveAction: async (): Promise<CorrectiveAction> => {
    throw new Error('Corrective actions are resolved through the alert lifecycle.');
  },

  // ── Feature 08: close-out loop (move the action to a terminal state) ──────
  submitCloseout: async (
    id: string,
    input: { recommendation: string; effectiveness: string; evidenceNote?: string }
  ): Promise<CorrectiveCloseout> => {
    try {
      const res = await apiClient.post<{ data: CorrectiveCloseout }>(
        endpoints.correctiveActions.closeOut(id),
        input
      );
      return res.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  approveCloseout: async (id: string, reviewNote?: string): Promise<CorrectiveCloseout> => {
    try {
      const res = await apiClient.post<{ data: CorrectiveCloseout }>(
        endpoints.correctiveActions.approve(id),
        { reviewNote: reviewNote || undefined }
      );
      return res.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  rejectCloseout: async (id: string, reviewNote?: string): Promise<CorrectiveCloseout> => {
    try {
      const res = await apiClient.post<{ data: CorrectiveCloseout }>(
        endpoints.correctiveActions.reject(id),
        { reviewNote: reviewNote || undefined }
      );
      return res.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};