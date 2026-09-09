import { useQuery } from '@tanstack/react-query';
import { documentService } from '@/services/documentService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useDocuments = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.documents.all, params],
    queryFn: () => documentService.getDocuments(params),
  });
};
