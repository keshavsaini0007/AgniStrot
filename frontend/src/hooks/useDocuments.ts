import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '@/services/documentService';
import { queryKeys } from './useMines';
import type { FilterParams } from '@/types';

export const useDocuments = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.documents.all, params],
    queryFn: () => documentService.getDocuments(params),
  });
};

export const useIngestDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: documentService.ingest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
};

export const useConfirmDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: { fieldName: string; value: string }[] }) =>
      documentService.confirm(id, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
};