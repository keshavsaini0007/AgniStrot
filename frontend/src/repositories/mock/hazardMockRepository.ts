import { delay } from '@/mock/database';
import type {
  AddHazardControlInput,
  Hazard,
  HazardControl,
  HazardControlStatus,
  HazardControlType,
  HazardDashboard,
  HazardListParams,
  HazardRiskLevel,
  ItemResponse,
  PaginatedResponse,
  RegisterHazardInput,
} from '@/types';

// Feature 06 — demo build mirror. The backend runs the deterministic 5×5 matrix
// + hierarchy-of-controls engine server-side; this mock reproduces the exact
// same rules so the demo behaves identically (risk is never client-authored).

const WEIGHT: Record<HazardControlType, number> = {
  elimination: 5,
  substitution: 4,
  engineering: 3,
  administrative: 2,
  ppe: 1,
};

const clamp = (n: number) => Math.max(1, Math.min(5, Math.trunc(n)));

const riskLevelFor = (likelihood: number, consequence: number): { riskScore: number; riskLevel: HazardRiskLevel } => {
  const riskScore = clamp(likelihood) * clamp(consequence);
  if (riskScore >= 16) return { riskScore, riskLevel: 'critical' };
  if (riskScore >= 10) return { riskScore, riskLevel: 'high' };
  if (riskScore >= 5) return { riskScore, riskLevel: 'medium' };
  return { riskScore, riskLevel: 'low' };
};

const reductionFor = (tier: HazardControlType): number => {
  const w = WEIGHT[tier];
  if (w >= 5) return 3;
  if (w >= 4) return 2;
  if (w >= 3) return 1;
  return 0;
};

const assess = (controls: HazardControl[]): { status: HazardControlStatus; reduction: number } => {
  const strongest = controls
    .filter((c) => c.implemented)
    .sort((a, b) => WEIGHT[b.controlType] - WEIGHT[a.controlType])[0];
  if (!strongest) return { status: 'ineffective', reduction: 0 };
  const reduction = reductionFor(strongest.controlType);
  const status: HazardControlStatus = reduction >= 2 ? 'effective' : reduction >= 1 ? 'partially_effective' : 'ineffective';
  return { status, reduction };
};

const nextId = (() => {
  let n = 100;
  return () => `hz-${++n}`;
})();

let hazards: Hazard[] = buildSeed();

function buildSeed(): Hazard[] {
  const ctl = (
    description: string,
    controlType: HazardControlType,
    implemented: boolean,
  ): HazardControl => ({
    id: `ctl-${Math.random().toString(16).slice(2, 8)}`,
    description,
    controlType,
    ownerId: null,
    targetDate: null,
    implemented,
    implementedAt: implemented ? '2026-09-14T08:00:00.000Z' : null,
    implementedById: implemented ? 'usr-003' : null,
    createdAt: '2026-09-12T08:00:00.000Z',
  });

  const engVen = ctl('Bolt-down heavy-duty coupling guard with interlock', 'engineering', true);
  const engVenEff = assess([engVen]);
  const ven: Hazard = seedRow({
    id: 'hz-001',
    siteId: 'mine-001',
    siteName: 'Rajpur Coal Mine',
    category: 'VENTILATION',
    title: 'Damaged crusher coupling guard',
    description: 'Recurring damage to the coupling guard at the crusher transfer point.',
    likelihood: 4,
    consequence: 3,
    status: 'mitigating',
    controls: [engVen],
    effectiveness: {
      status: engVenEff.status,
      reduction: engVenEff.reduction,
      residualLikelihood: Math.max(1, 4 - engVenEff.reduction),
      residualConsequence: Math.max(1, 3 - engVenEff.reduction),
      residualRiskScore: 0,
      residualRiskLevel: 'low',
      recurrenceOverride: false,
      assessedAt: '2026-09-15T10:00:00.000Z',
      assessedBy: 'usr-003',
      note: 'Guards contain the hazard but do not remove the driver.',
    },
  });
  const r = riskLevelFor(ven.likelihood, ven.consequence);
  ven.riskScore = r.riskScore;
  ven.riskLevel = r.riskLevel;
  const eff = ven.effectiveness!;
  const rem = riskLevelFor(eff.residualLikelihood, eff.residualConsequence);
  eff.residualRiskScore = rem.riskScore;
  eff.residualRiskLevel = rem.riskLevel;

  const subRoof = ctl('Replace wooden chocks with hydraulic roof supports', 'substitution', true);
  const subRoofEff = assess([subRoof]);
  const roof: Hazard = seedRow({
    id: 'hz-002',
    siteId: 'mine-001',
    siteName: 'Rajpur Coal Mine',
    category: 'GROUND_CONTROL',
    title: 'Roof fall risk at B-crossover',
    description: 'Loose strata observed at the B-crossover junction after blasting.',
    likelihood: 4,
    consequence: 5,
    status: 'controlled',
    controls: [subRoof],
    effectiveness: {
      status: subRoofEff.status,
      reduction: subRoofEff.reduction,
      residualLikelihood: Math.max(1, 4 - subRoofEff.reduction),
      residualConsequence: Math.max(1, 5 - subRoofEff.reduction),
      residualRiskScore: 0,
      residualRiskLevel: 'low',
      recurrenceOverride: false,
      assessedAt: '2026-09-16T09:00:00.000Z',
      assessedBy: 'usr-003',
      note: 'Substitution removes the hazardous agent.',
    },
  });
  const r2 = riskLevelFor(roof.likelihood, roof.consequence);
  roof.riskScore = r2.riskScore;
  roof.riskLevel = r2.riskLevel;
  const eff2 = roof.effectiveness!;
  const rem2 = riskLevelFor(eff2.residualLikelihood, eff2.residualConsequence);
  eff2.residualRiskScore = rem2.riskScore;
  eff2.residualRiskLevel = rem2.riskLevel;

  const ppeSign = ctl('Provide reflective vests + signage', 'ppe', false);
  const sign: Hazard = seedRow({
    id: 'hz-003',
    siteId: 'mine-002',
    siteName: 'Dhanbad Coal Mine',
    category: 'HOUSEKEEPING',
    title: 'Haulage road dust and visibility',
    description: 'Silica dust reduces visibility on the main haulage road.',
    likelihood: 3,
    consequence: 2,
    status: 'open',
    controls: [ppeSign],
  });
  const r3 = riskLevelFor(sign.likelihood, sign.consequence);
  sign.riskScore = r3.riskScore;
  sign.riskLevel = r3.riskLevel;

  const elecClosed = ctl('Isolate and de-energise obsolete feeder panel', 'elimination', true);
  const elec: Hazard = seedRow({
    id: 'hz-004',
    siteId: 'mine-002',
    siteName: 'Dhanbad Coal Mine',
    category: 'ELECTRICAL',
    title: 'Obsolete live feeder panel near walkway',
    description: 'De-energised and removed in the Q3 electrical audit.',
    likelihood: 2,
    consequence: 4,
    status: 'closed',
    controls: [elecClosed],
    effectiveness: {
      status: 'effective',
      reduction: 3,
      residualLikelihood: 1,
      residualConsequence: 1,
      residualRiskScore: 1,
      residualRiskLevel: 'low',
      recurrenceOverride: false,
      assessedAt: '2026-09-10T09:00:00.000Z',
      assessedBy: 'usr-003',
      note: 'Elimination removes the driver entirely.',
    },
    closedAt: '2026-09-18T10:00:00.000Z',
    closedBy: 'usr-003',
    closureNote: 'Panel removed; area re-inspected with zero findings.',
  });
  const r4 = riskLevelFor(elec.likelihood, elec.consequence);
  elec.riskScore = r4.riskScore;
  elec.riskLevel = r4.riskLevel;

  return [ven, roof, sign, elec];
}

function seedRow(partial: Partial<Hazard> & { id: string; siteId: string; siteName: string | null; category: string; title: string; description: string; likelihood: number; consequence: number; status: Hazard['status'] }): Hazard {
  const base: Hazard = {
    id: partial.id,
    siteId: partial.siteId,
    siteName: partial.siteName,
    category: partial.category,
    title: partial.title,
    description: partial.description,
    location: null,
    sourceType: 'manual',
    sourceAlertId: null,
    registeredBy: 'usr-003',
    registeredByName: 'Amit Sharma',
    registeredAt: '2026-09-12T08:00:00.000Z',
    likelihood: partial.likelihood,
    consequence: partial.consequence,
    riskScore: 0,
    riskLevel: 'low',
    status: partial.status,
    controls: partial.controls ?? [],
    effectiveness: partial.effectiveness ?? null,
    closedAt: partial.closedAt ?? null,
    closedBy: partial.closedBy ?? null,
    closureNote: partial.closureNote ?? null,
    createdAt: '2026-09-12T08:00:00.000Z',
    updatedAt: '2026-09-12T08:00:00.000Z',
  };
  return base;
}

const computeDashboard = (): HazardDashboard => {
  const count = (s: Hazard['status']) => hazards.filter((h) => h.status === s).length;
  return {
    total: hazards.length,
    open: count('open'),
    mitigating: count('mitigating'),
    controlled: count('controlled'),
    closed: count('closed'),
    high: hazards.filter((h) => h.riskLevel === 'high').length,
    critical: hazards.filter((h) => h.riskLevel === 'critical').length,
  };
};

export const hazardMockRepository = {
  list: async (params?: HazardListParams): Promise<PaginatedResponse<Hazard>> => {
    await delay(400);
    let filtered = [...hazards];
    if (params?.status) filtered = filtered.filter((h) => h.status === params.status);
    if (params?.riskLevel) filtered = filtered.filter((h) => h.riskLevel === params.riskLevel);
    if (params?.category) filtered = filtered.filter((h) => h.category === params.category);
    if (params?.siteId) filtered = filtered.filter((h) => h.siteId === params.siteId);
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (h) => h.title.toLowerCase().includes(q) || h.category.toLowerCase().includes(q),
      );
    }
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    return {
      success: true,
      data: filtered.slice((page - 1) * limit, page * limit),
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    };
  },

  get: async (id: string): Promise<ItemResponse<Hazard>> => {
    await delay(300);
    const row = hazards.find((h) => h.id === id);
    if (!row) throw new Error('Hazard not found');
    return { success: true, data: row };
  },

  getDashboard: async (): Promise<ItemResponse<HazardDashboard>> => {
    await delay(400);
    return { success: true, data: computeDashboard() };
  },

  register: async (input: RegisterHazardInput): Promise<ItemResponse<Hazard>> => {
    await delay(500);
    const { riskScore, riskLevel } = riskLevelFor(input.likelihood, input.consequence);
    const mine = mockMines.find((m) => m.id === input.siteId);
    const row: Hazard = seedRow({
      id: nextId(),
      siteId: input.siteId,
      siteName: mine?.name ?? null,
      category: 'GENERAL',
      title: input.title,
      description: input.description,
      likelihood: input.likelihood,
      consequence: input.consequence,
      status: 'open',
    });
    row.riskScore = riskScore;
    row.riskLevel = riskLevel;
    row.sourceType = input.sourceAlertId ? 'alert' : 'manual';
    row.sourceAlertId = input.sourceAlertId ?? null;
    hazards = [row, ...hazards];
    return { success: true, data: row };
  },

  update: async (
    id: string,
    input: { title?: string; description?: string; likelihood?: number; consequence?: number },
  ): Promise<ItemResponse<Hazard>> => {
    await delay(400);
    const row = hazards.find((h) => h.id === id);
    if (!row) throw new Error('Hazard not found');
    if (row.status === 'closed') throw new Error('Closed hazards are immutable.');
    if (input.title !== undefined) row.title = input.title;
    if (input.description !== undefined) row.description = input.description;
    if (input.likelihood !== undefined) row.likelihood = input.likelihood;
    if (input.consequence !== undefined) row.consequence = input.consequence;
    const { riskScore, riskLevel } = riskLevelFor(row.likelihood, row.consequence);
    row.riskScore = riskScore;
    row.riskLevel = riskLevel;
    row.updatedAt = new Date().toISOString();
    return { success: true, data: row };
  },

  addControl: async (id: string, input: AddHazardControlInput): Promise<ItemResponse<Hazard>> => {
    await delay(400);
    const row = hazards.find((h) => h.id === id);
    if (!row) throw new Error('Hazard not found');
    if (row.status === 'closed') throw new Error('Closed hazards are immutable.');
    const control: HazardControl = {
      id: `ctl-${Math.random().toString(16).slice(2, 8)}`,
      description: input.description,
      controlType: input.controlType,
      ownerId: null,
      targetDate: null,
      implemented: false,
      implementedAt: null,
      implementedById: null,
      createdAt: new Date().toISOString(),
    };
    row.controls = [...row.controls, control];
    row.updatedAt = new Date().toISOString();
    return { success: true, data: row };
  },

  implementControl: async (id: string, controlId: string): Promise<ItemResponse<Hazard>> => {
    await delay(400);
    const row = hazards.find((h) => h.id === id);
    if (!row) throw new Error('Hazard not found');
    if (row.status === 'closed') throw new Error('Closed hazards are immutable.');
    const control = row.controls.find((c) => c.id === controlId);
    if (!control) throw new Error('Control not found');
    if (!control.implemented) {
      control.implemented = true;
      control.implementedAt = new Date().toISOString();
      control.implementedById = 'usr-003';
      row.status = 'mitigating';
    }
    row.updatedAt = new Date().toISOString();
    return { success: true, data: row };
  },

  assessEffectiveness: async (id: string): Promise<ItemResponse<Hazard>> => {
    await delay(500);
    const row = hazards.find((h) => h.id === id);
    if (!row) throw new Error('Hazard not found');
    if (row.status === 'closed') throw new Error('Closed hazards cannot be re-assessed.');
    const { status, reduction } = assess(row.controls);
    const residual = riskLevelFor(
      Math.max(1, row.likelihood - reduction),
      Math.max(1, row.consequence - reduction),
    );
    row.effectiveness = {
      status,
      reduction,
      residualLikelihood: Math.max(1, row.likelihood - reduction),
      residualConsequence: Math.max(1, row.consequence - reduction),
      residualRiskScore: residual.riskScore,
      residualRiskLevel: residual.riskLevel,
      recurrenceOverride: false,
      assessedAt: new Date().toISOString(),
      assessedBy: 'usr-003',
      note:
        status === 'effective'
          ? 'Strongest implemented control removes or substitutes the hazardous agent.'
          : status === 'partially_effective'
            ? 'Engineering containment in place — residual risk still elevated, upgrade tier recommended.'
            : 'No structural reduction — implement an engineering or higher-tier control.',
    };
    row.status = status === 'effective' ? 'controlled' : 'mitigating';
    row.updatedAt = new Date().toISOString();
    return { success: true, data: row };
  },

  close: async (id: string, closureNote: string): Promise<ItemResponse<Hazard>> => {
    await delay(400);
    const row = hazards.find((h) => h.id === id);
    if (!row) throw new Error('Hazard not found');
    if (row.status !== 'controlled') throw new Error('Only controlled hazards can be closed.');
    row.status = 'closed';
    row.closedAt = new Date().toISOString();
    row.closedBy = 'usr-003';
    row.closureNote = closureNote;
    row.updatedAt = new Date().toISOString();
    return { success: true, data: row };
  },
};

// Mine references for the register form's site picker (mirrors mockMines).
const mockMines: Array<{ id: string; name: string }> = [
  { id: 'mine-001', name: 'Rajpur Coal Mine' },
  { id: 'mine-002', name: 'Dhanbad Coal Mine' },
  { id: 'mine-003', name: 'Korba Coal Mine' },
];