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
  incidents: {
    all: ['incidents'] as const,
    detail: (id: string) => ['incidents', id] as const,
  },
  attendance: {
    all: ['attendance'] as const,
  },
  alerts: {
    all: ['alerts'] as const,
  },
  audit: {
    all: ['audit'] as const,
  },
  reports: {
    all: ['reports'] as const,
  },
  gis: {
    all: ['gis'] as const,
  },
  documents: {
    all: ['documents'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
  },
  ai: {
    risk: ['ai', 'risk'] as const,
    trends: ['ai', 'trends'] as const,
    summary: ['ai', 'summary'] as const,
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
  users: {
    all: ['users'] as const,
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