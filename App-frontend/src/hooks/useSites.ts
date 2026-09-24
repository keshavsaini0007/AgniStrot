import { useQuery } from '@tanstack/react-query';
import { siteService } from '@/services/siteService';
import { queryKeys } from './useMines';
import type { SiteOption } from '@/services/siteService';

/** Live site list (feature 07 manage modal picker). */
export const useSites = () => {
  return useQuery({
    queryKey: queryKeys.sites.all,
    queryFn: () => siteService.getSites(),
  });
};

export type { SiteOption };