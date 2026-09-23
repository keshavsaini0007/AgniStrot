import { hazardRepository } from '@/repositories';
import type {
  AddHazardControlInput,
  Hazard,
  HazardDashboard,
  HazardListParams,
  ItemResponse,
  PaginatedResponse,
  RegisterHazardInput,
  UpdateHazardInput,
} from '@/types';

// Feature 06 — hazard register feed (mirrors backend /hazards routes).
export const hazardService = {
  list: async (params?: HazardListParams): Promise<PaginatedResponse<Hazard>> => {
    return await hazardRepository.list(params);
  },

  get: async (id: string): Promise<ItemResponse<Hazard>> => {
    return await hazardRepository.get(id);
  },

  getDashboard: async (params?: { siteId?: string }): Promise<ItemResponse<HazardDashboard>> => {
    return await hazardRepository.getDashboard(params);
  },

  register: async (input: RegisterHazardInput): Promise<ItemResponse<Hazard>> => {
    return await hazardRepository.register(input);
  },

  update: async (id: string, input: UpdateHazardInput): Promise<ItemResponse<Hazard>> => {
    return await hazardRepository.update(id, input);
  },

  addControl: async (id: string, input: AddHazardControlInput): Promise<ItemResponse<Hazard>> => {
    return await hazardRepository.addControl(id, input);
  },

  implementControl: async (id: string, controlId: string): Promise<ItemResponse<Hazard>> => {
    return await hazardRepository.implementControl(id, controlId);
  },

  assessEffectiveness: async (id: string): Promise<ItemResponse<Hazard>> => {
    return await hazardRepository.assessEffectiveness(id);
  },

  close: async (id: string, closureNote: string): Promise<ItemResponse<Hazard>> => {
    return await hazardRepository.close(id, closureNote);
  },
};