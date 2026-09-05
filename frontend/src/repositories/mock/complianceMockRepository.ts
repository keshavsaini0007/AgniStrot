import { mockCompliance, delay } from '@/mock/database';
import type { ComplianceRequirement, FilterParams, PaginatedResponse } from '@/types';

let compliance = [...mockCompliance];

export const complianceMockRepository = {
  getCompliance: async (params?: FilterParams): Promise<PaginatedResponse<ComplianceRequirement>> => {
    await delay(400);
    let filteredCompliance = [...compliance];
    
    if (params?.mineId) {
      filteredCompliance = filteredCompliance.filter(comp => comp.mineId === params.mineId);
    }

    if (params?.status) {
      filteredCompliance = filteredCompliance.filter(comp => comp.status === params.status);
    }

    if (params?.category) {
      filteredCompliance = filteredCompliance.filter(comp => comp.category === params.category);
    }

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      success: true,
      data: filteredCompliance.slice(start, end),
      meta: {
        page,
        limit,
        total: filteredCompliance.length,
        totalPages: Math.ceil(filteredCompliance.length / limit),
      },
    };
  },

  getComplianceById: async (id: string): Promise<ComplianceRequirement> => {
    await delay(300);
    const comp = compliance.find(c => c.id === id);
    if (!comp) {
      throw new Error('Compliance requirement not found');
    }
    return comp;
  },

  createCompliance: async (data: Omit<ComplianceRequirement, 'id' | 'createdAt' | 'updatedAt'>): Promise<ComplianceRequirement> => {
    await delay(500);
    const newCompliance: ComplianceRequirement = {
      ...data,
      id: `comp-${String(compliance.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    compliance.push(newCompliance);
    return newCompliance;
  },

  updateCompliance: async (id: string, data: Partial<ComplianceRequirement>): Promise<ComplianceRequirement> => {
    await delay(400);
    const index = compliance.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Compliance requirement not found');
    }
    compliance[index] = { ...compliance[index], ...data, updatedAt: new Date().toISOString() };
    return compliance[index];
  },
};