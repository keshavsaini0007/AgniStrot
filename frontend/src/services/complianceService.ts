import { complianceRepository } from '@/repositories';
import type { ComplianceRequirement, FilterParams, PaginatedResponse } from '@/types';

export const complianceService = {
  getCompliance: async (params?: FilterParams): Promise<PaginatedResponse<ComplianceRequirement>> => {
    return await complianceRepository.getCompliance(params);
  },

  getComplianceById: async (id: string): Promise<ComplianceRequirement> => {
    return await complianceRepository.getComplianceById(id);
  },

  createCompliance: async (data: Omit<ComplianceRequirement, 'id' | 'createdAt' | 'updatedAt'>): Promise<ComplianceRequirement> => {
    return await complianceRepository.createCompliance(data);
  },

  updateCompliance: async (id: string, data: Partial<ComplianceRequirement>): Promise<ComplianceRequirement> => {
    return await complianceRepository.updateCompliance(id, data);
  },
};