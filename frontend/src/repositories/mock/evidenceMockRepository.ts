import { delay } from '@/mock/database';
import type {
  Evidence,
  EvidenceDashboard,
  EvidenceIntegrityStatus,
  EvidenceVerifyResult,
  FilterParams,
  PaginatedResponse,
  ItemResponse,
  VerifyAllSummary,
} from '@/types';

// Demo build fixture — one row per integrity state so the dashboard shows a
// realistic spread (verified / tampered / no baseline / failed upload).
const HASH_A = 'a3f5c8d1e2b49670f8c1d2e3a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7';
const HASH_B = 'a3f5c8d1e2b49670f8c1d2e3a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7'; // twin of A
const HASH_C = '0f1e2d3c4b5a69788796a5b4c3d2e1f00112233445566778899aabbccddeeff';

let evidence: Evidence[] = [
  {
    id: 'ev-001',
    sourceType: 'media',
    sourceRecordId: null,
    siteId: 'mine-001',
    fileUrl: '/evidence/entry-gate-shift-photo.jpg',
    fileName: 'entry-gate-shift-photo.jpg',
    contentHash: HASH_A,
    uploadedByName: 'Rahul Kumar',
    uploadedAt: '2026-09-18T06:12:00.000Z',
    integrityStatus: 'verified',
    verificationNote: 'MATCH: recomputed hash equals the recorded content hash.',
    checkCount: 2,
    lastVerifiedAt: '2026-09-21T09:30:00.000Z',
    createdAt: '2026-09-18T06:12:00.000Z',
    duplicateCount: 1,
  },
  {
    id: 'ev-002',
    sourceType: 'media',
    sourceRecordId: null,
    siteId: 'mine-002',
    fileUrl: '/evidence/entry-gate-shift-photo-copy.jpg',
    fileName: 'entry-gate-shift-photo-copy.jpg',
    contentHash: HASH_B,
    uploadedByName: 'Priya Singh',
    uploadedAt: '2026-09-19T11:45:00.000Z',
    integrityStatus: 'INTEGRITY_MISMATCH',
    verificationNote: 'INTEGRITY_MISMATCH: recomputed b7e1… != recorded a3f5…',
    checkCount: 1,
    lastVerifiedAt: '2026-09-21T09:31:00.000Z',
    createdAt: '2026-09-19T11:45:00.000Z',
    duplicateCount: 1,
  },
  {
    id: 'ev-003',
    sourceType: 'document',
    sourceRecordId: 'doc-002',
    siteId: 'mine-002',
    fileUrl: '/evidence/dust-permit-form.png',
    fileName: 'dust-permit-form.png',
    contentHash: HASH_C,
    uploadedByName: 'Priya Singh',
    uploadedAt: '2026-09-20T08:02:00.000Z',
    integrityStatus: 'unverified',
    verificationNote: null,
    checkCount: 0,
    lastVerifiedAt: null,
    createdAt: '2026-09-20T08:02:00.000Z',
    duplicateCount: 0,
  },
  {
    id: 'ev-004',
    sourceType: 'media',
    sourceRecordId: null,
    siteId: 'mine-001',
    fileUrl: '/evidence/upload-failed-legacy.jpg',
    fileName: 'upload-failed-legacy.jpg',
    contentHash: null,
    uploadedByName: 'Rahul Kumar',
    uploadedAt: '2026-09-20T14:27:00.000Z',
    integrityStatus: 'UPLOAD_FAILED',
    verificationNote: 'Cloudinary upload failed — no stored file.',
    checkCount: 0,
    lastVerifiedAt: null,
    createdAt: '2026-09-20T14:27:00.000Z',
    duplicateCount: 0,
  },
];

const computeDashboard = (): EvidenceDashboard => {
  const verified = evidence.filter((e) => e.integrityStatus === 'verified').length;
  const mismatched = evidence.filter((e) => e.integrityStatus === 'INTEGRITY_MISMATCH').length;
  const unavailable = evidence.filter((e) => e.integrityStatus === 'unavailable').length;
  const unverified = evidence.filter((e) => e.integrityStatus === 'unverified').length;
  const uploadFailed = evidence.filter((e) => e.integrityStatus === 'UPLOAD_FAILED').length;
  const uploadPending = evidence.filter((e) => e.integrityStatus === 'UPLOAD_PENDING').length;
  return {
    total: evidence.length,
    checked: verified + mismatched + unavailable,
    verified,
    mismatched,
    unverified,
    unavailable,
    uploadFailed,
    uploadPending,
    // Demo source documents that predate feature 05 (no attestation row).
    noBaseline: 2,
  };
};

export const evidenceMockRepository = {
  getEvidence: async (params?: FilterParams): Promise<PaginatedResponse<Evidence>> => {
    await delay(400);
    let filtered = [...evidence];
    if (params?.status) {
      filtered = filtered.filter((e) => e.integrityStatus === params.status);
    }
    if (params?.siteId) {
      filtered = filtered.filter((e) => e.siteId === params.siteId);
    }
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    return {
      success: true,
      data: filtered.slice((page - 1) * limit, page * limit),
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    };
  },

  getDashboard: async (): Promise<ItemResponse<EvidenceDashboard>> => {
    await delay(400);
    return { success: true, data: computeDashboard() };
  },

  verify: async (id: string): Promise<ItemResponse<EvidenceVerifyResult>> => {
    await delay(500);
    const index = evidence.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Evidence not found');
    const row = evidence[index];
    // Demo rule: rows with a hash but no stored fixture file verify as
    // unavailable; ev-002's mismatch is sticky (tampered bytes).
    const integrityStatus: EvidenceIntegrityStatus =
      row.integrityStatus === 'UPLOAD_FAILED'
        ? 'UPLOAD_FAILED'
        : row.contentHash === null
          ? 'unverified'
          : row.integrityStatus === 'INTEGRITY_MISMATCH'
            ? 'INTEGRITY_MISMATCH'
            : 'verified';
    const updated: Evidence = {
      ...row,
      integrityStatus,
      checkCount: row.checkCount + 1,
      lastVerifiedAt: new Date().toISOString(),
      verificationNote:
        integrityStatus === 'verified'
          ? 'MATCH: recomputed hash equals the recorded content hash.'
          : row.verificationNote,
    };
    evidence[index] = updated;
    return {
      success: true,
      data: {
        id: updated.id,
        integrityStatus: updated.integrityStatus,
        checkCount: updated.checkCount,
        lastVerifiedAt: updated.lastVerifiedAt ?? new Date().toISOString(),
        verificationNote: updated.verificationNote,
      },
    };
  },

  verifyAll: async (): Promise<ItemResponse<VerifyAllSummary>> => {
    await delay(700);
    const summary: VerifyAllSummary = {
      checked: 0,
      verified: 0,
      mismatched: 0,
      unavailable: 0,
      unverified: 0,
      uploadFailed: 0,
      failed: 0,
    };
    for (const row of evidence) {
      try {
        const res = await evidenceMockRepository.verify(row.id);
        summary.checked += 1;
        const s = res.data.integrityStatus;
        if (s === 'verified') summary.verified += 1;
        else if (s === 'INTEGRITY_MISMATCH') summary.mismatched += 1;
        else if (s === 'unavailable') summary.unavailable += 1;
        else if (s === 'UPLOAD_FAILED') summary.uploadFailed += 1;
        else summary.unverified += 1;
      } catch {
        summary.failed += 1;
      }
    }
    return { success: true, data: summary };
  },
};
