import { siteRepository } from '@/repositories';
import type { SiteOption } from '@/repositories/api/siteApiRepository';

export type { SiteOption };

export const siteService = {
  getSites: async (): Promise<SiteOption[]> => {
    return await siteRepository.getSites();
  },
};