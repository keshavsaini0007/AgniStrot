import apiClient, { normalizeList } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';
import type { ComplianceRequirement, FilterParams, PaginatedResponse } from '@/types';

/**
 * Backend contract for /compliance — a read-only, derived requirement
 * register computed per site (see backend compliance.controller.ts).
 */
type ComplianceDto = {
  id: string;
  siteId: string;
  siteName: string;
  requirement: string;
  category: 'inspection' | 'incident' | 'alert' | 'overall';
  description: string;
  status: ComplianceRequirement['status'];
  dueDate: string;
  responsibleDepartment: string;
  documents: string[];
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

function toCompliance(d: ComplianceDto): ComplianceRequirement {
  return {
    id: d.id,
    mineId: d.siteId,
    requirement: d.requirement,
    category: d.category,
    description: d.description,
    status: d.status,
    dueDate: d.dueDate,
    responsibleDepartment: d.responsibleDepartment,
    documents: d.documents ?? [],
    lastReviewedAt: d.lastReviewedAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export const complianceApiRepository = {
  getCompliance: async (params?: FilterParams): Promise<PaginatedResponse<ComplianceRequirement>> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.COMPLIANCE.BASE, {
        params: {
          siteId: params?.siteId || undefined,
          status: params?.status || undefined,
          page: params?.page || 1,
          limit: params?.limit || 50,
        },
      });
      const res = normalizeList<ComplianceDto>(response.data);
      return { ...res, data: res.data.map(toCompliance) };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getComplianceById: async (id: string): Promise<ComplianceRequirement> => {
    try {
      // No dedicated detail endpoint — the feed row IS the record. Fetch page 1
      // with a generous limit and locate it; the id embeds `siteId:category:ordinal`.
      const response = await apiClient.get(API_ENDPOINTS.COMPLIANCE.BASE, {
        params: { limit: 100 },
      });
      const res = normalizeList<ComplianceDto>(response.data);
      const found = res.data.map(toCompliance).find((c) => c.id === id);
      if (!found) throw new Error('Compliance requirement not found.');
      return found;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  createCompliance: async (_data: Omit<ComplianceRequirement, 'id' | 'createdAt' | 'updatedAt'>): Promise<ComplianceRequirement> => {
    throw new Error('Compliance requirements are computed from live site data — they cannot be created manually.');
  },

  updateCompliance: async (_id: string, _data: Partial<ComplianceRequirement>): Promise<ComplianceRequirement> => {
    throw new Error('Compliance is read-only — it is derived from live site data.');
  },
};