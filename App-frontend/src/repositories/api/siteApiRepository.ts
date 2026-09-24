import { apiClient } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';

export interface SiteOption {
  siteId: string;
  name: string;
}

interface BackendSite {
  _id: string;
  name: string;
  subsidiary?: string;
}

/**
 * Live site list (GET /sites, role-scoped) — used by the feature-07 manage
 * modal to bind site-scoped roles to a real site ObjectId. mine_official sees
 * only their own site; corporate_manager sees all.
 */
export const siteApiRepository = {
  getSites: async (): Promise<SiteOption[]> => {
    try {
      const res = await apiClient.get<{ sites: BackendSite[]; total: number }>(
        endpoints.sites.list
      );
      return (res.data.sites ?? []).map((s) => ({
        siteId: s._id,
        name: s.name,
      }));
    } catch (error) {
      throw handleApiError(error);
    }
  },
};