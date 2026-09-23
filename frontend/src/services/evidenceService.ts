import { evidenceRepository } from '@/repositories';
import type {
  Evidence,
  EvidenceDashboard,
  EvidenceVerifyResult,
  FilterParams,
  PaginatedResponse,
  ItemResponse,
  VerifyAllSummary,
} from '@/types';

// Feature 05 — evidence integrity feed (mirrors backend /evidence routes).
export const evidenceService = {
  getEvidence: async (params?: FilterParams): Promise<PaginatedResponse<Evidence>> => {
    return await evidenceRepository.getEvidence(params);
  },

  getDashboard: async (params?: FilterParams): Promise<ItemResponse<EvidenceDashboard>> => {
    return await evidenceRepository.getDashboard(params);
  },

  verify: async (id: string): Promise<ItemResponse<EvidenceVerifyResult>> => {
    return await evidenceRepository.verify(id);
  },

  verifyAll: async (): Promise<ItemResponse<VerifyAllSummary>> => {
    return await evidenceRepository.verifyAll();
  },
};