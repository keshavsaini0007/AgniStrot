import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mineService } from '@/services/mineService';
import type { FilterParams } from '@/types';

export const queryKeys = {
  mines: {
    all: ['mines'] as const,
    detail: (id: string) => ['mines', id] as const,
  },
  inspections: {
    all: ['inspections'] as const,
    detail: (id: string) => ['inspections', id] as const,
  },
  observations: {
    all: ['observations'] as const,
    detail: (id: string) => ['observations', id] as const,
  },
  correctiveActions: {
    all: ['correctiveActions'] as const,
    detail: (id: string) => ['correctiveActions', id] as const,
  },
  compliance: {
    all: ['compliance'] as const,
    detail: (id: string) => ['compliance', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unreadCount: ['notifications', 'unreadCount'] as const,
  },
  analytics: {
    dashboard: ['analytics', 'dashboard'] as const,
    compliance: ['analytics', 'compliance'] as const,
    risk: ['analytics', 'risk'] as const,
    inspections: ['analytics', 'inspections'] as const,
  },
};

export const useMines = (params?: FilterParams) => {
  return useQuery({
    queryKey: [...queryKeys.mines.all, params],
    queryFn: () => mineService.getMines(params),
  });
};

export const useMine = (id: string) => {
  return useQuery({
    queryKey: queryKeys.mines.detail(id),
    queryFn: () => mineService.getMineById(id),
  });
};

export const useCreateMine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mineService.createMine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mines.all });
    },
  });
};

export const useUpdateMine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => mineService.updateMine(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mines.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.mines.detail(id) });
    },
  });
};

export const useDeleteMine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mineService.deleteMine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mines.all });
    },
  });
};