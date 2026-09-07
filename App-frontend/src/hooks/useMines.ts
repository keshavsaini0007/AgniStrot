import { useQuery } from '@tanstack/react-query';
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
