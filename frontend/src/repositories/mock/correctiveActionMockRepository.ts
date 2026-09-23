import { mockCorrectiveActions, delay } from '@/mock/database';
import type { CorrectiveAction, FilterParams, PaginatedResponse } from '@/types';

let correctiveActions = [...mockCorrectiveActions];

export const correctiveActionMockRepository = {
  getCorrectiveActions: async (params?: FilterParams): Promise<PaginatedResponse<CorrectiveAction>> => {
    await delay(400);
    let filteredActions = [...correctiveActions];
    
    if (params?.mineId) {
      filteredActions = filteredActions.filter(action => action.mineId === params.mineId);
    }

    if (params?.observationId) {
      filteredActions = filteredActions.filter(action => action.observationId === params.observationId);
    }

    if (params?.status) {
      filteredActions = filteredActions.filter(action => action.status === params.status);
    }

    if (params?.priority) {
      filteredActions = filteredActions.filter(action => action.priority === params.priority);
    }

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      success: true,
      data: filteredActions.slice(start, end),
      meta: {
        page,
        limit,
        total: filteredActions.length,
        totalPages: Math.ceil(filteredActions.length / limit),
      },
    };
  },

  getCorrectiveActionById: async (id: string): Promise<CorrectiveAction> => {
    await delay(300);
    const action = correctiveActions.find(a => a.id === id);
    if (!action) {
      throw new Error('Corrective action not found');
    }
    return action;
  },

  createCorrectiveAction: async (data: Omit<CorrectiveAction, 'id' | 'createdAt' | 'updatedAt'>): Promise<CorrectiveAction> => {
    await delay(500);
    const newAction: CorrectiveAction = {
      ...data,
      id: `ca-${String(correctiveActions.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    correctiveActions.push(newAction);
    return newAction;
  },

  updateCorrectiveAction: async (id: string, data: Partial<CorrectiveAction>): Promise<CorrectiveAction> => {
    await delay(400);
    const index = correctiveActions.findIndex(a => a.id === id);
    if (index === -1) {
      throw new Error('Corrective action not found');
    }
    correctiveActions[index] = { ...correctiveActions[index], ...data, updatedAt: new Date().toISOString() };
    return correctiveActions[index];
  },

  // ── Feature 08: close-out loop (mock parity with the real API contract) ──
  submitCloseout: async (
    id: string,
    input: { recommendation: string; effectiveness: string; evidenceNote?: string }
  ): Promise<NonNullable<CorrectiveAction['closeout']>> => {
    await delay(400);
    const index = correctiveActions.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Corrective action not found');
    const action = correctiveActions[index];
    if (action.closeout?.status === 'approved') throw new Error('Close-out is already approved.');
    if (action.closeout?.status === 'submitted') throw new Error('Close-out is already submitted and awaiting review.');
    const closeout: NonNullable<CorrectiveAction['closeout']> = {
      status: 'submitted',
      recommendation: input.recommendation,
      effectiveness: input.effectiveness,
      ...(input.evidenceNote ? { evidenceNote: input.evidenceNote } : {}),
      submittedBy: 'Priya Singh',
      submittedAt: new Date().toISOString(),
    };
    correctiveActions[index] = { ...action, closeout, status: 'verified', updatedAt: new Date().toISOString() };
    return closeout;
  },

  approveCloseout: async (id: string, reviewNote?: string): Promise<NonNullable<CorrectiveAction['closeout']>> => {
    await delay(400);
    const index = correctiveActions.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Corrective action not found');
    const action = correctiveActions[index];
    if (!action.closeout) throw new Error('No close-out has been submitted for this corrective action.');
    if (action.closeout.status !== 'submitted') throw new Error('Close-out has already been reviewed.');
    const closeout: NonNullable<CorrectiveAction['closeout']> = {
      ...action.closeout,
      status: 'approved',
      reviewedBy: 'Amit Sharma',
      reviewedAt: new Date().toISOString(),
      ...(reviewNote ? { reviewNote } : {}),
    };
    correctiveActions[index] = { ...action, closeout, status: 'closed', updatedAt: new Date().toISOString() };
    return closeout;
  },

  rejectCloseout: async (id: string, reviewNote?: string): Promise<NonNullable<CorrectiveAction['closeout']>> => {
    await delay(400);
    const index = correctiveActions.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Corrective action not found');
    const action = correctiveActions[index];
    if (!action.closeout) throw new Error('No close-out has been submitted for this corrective action.');
    if (action.closeout.status !== 'submitted') throw new Error('Close-out has already been reviewed.');
    const closeout: NonNullable<CorrectiveAction['closeout']> = {
      ...action.closeout,
      status: 'rejected',
      reviewedBy: 'Amit Sharma',
      reviewedAt: new Date().toISOString(),
      ...(reviewNote ? { reviewNote } : {}),
    };
    correctiveActions[index] = { ...action, closeout, status: 'rejected', updatedAt: new Date().toISOString() };
    return closeout;
  },
};