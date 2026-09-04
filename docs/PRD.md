# Product Requirements Document (PRD)
# Smart Governance & Compliance Monitoring Platform for Coal Mining Operations

**Version:** 1.0 (MVP scope, SIH build)
**Status:** Approved for implementation
**Related documents:** `PROJECT-UNDERSTANDING.md`, `MVP-IMPLEMENTATION-SPEC.md`

---

## 1. Purpose

This PRD defines what we are building and why, at a product level, so that every implementation decision downstream can be traced back to a stated requirement rather than assumed. It consolidates the decisions already made in prior planning documents into a single source of truth for the build phase.

---

## 2. Problem Statement (Summary)

Indian coal mining operations run governance activities — statutory compliance, inspections, safety observations, production/environmental reporting, worker attendance, contractor management, grievance handling — through fragmented, manual, paper/spreadsheet-based processes across multiple sites and subsidiaries. This causes data inconsistency, delayed decisions, weak field-level visibility, and compliance gaps.

**Product goal:** replace this fragmented process with a single digital platform providing real-time visibility, automated risk detection, and traceable, auditable governance — accessible via web (dashboard) and mobile (field capture).

---

## 3. Goals and Non-Goals

### 3.1 Goals (MVP)

**G1:** Enable field officers to capture inspections, incidents, and attendance digitally, offline-first, with geo/time-stamping.

**G2:** Give mine officials, corporate management, and regulators real-time, role-appropriate visibility into compliance and operational status.

**G3:** Automatically detect compliance risks and operational anomalies using rule-based logic, without requiring a human to notice them first.

**G4:** Automatically route alerts to the right stakeholder and escalate if unaddressed within a defined time window.

**G5:** Maintain a tamper-evident audit trail of all governance-relevant actions.

**G6:** Demonstrate the full loop (capture → detect → alert → escalate → resolve) convincingly for a hackathon evaluation.

### 3.2 Non-Goals (MVP — explicitly out of scope)

**NG1:** Trained ML models for risk prediction (rule-based + simple statistical anomaly detection only).

**NG2:** Literal blockchain infrastructure (hash-chained append-only log instead).

**NG3:** Multi-approval-chain workflows (single-approver only).

**NG4:** Cross-subsidiary rollups beyond 2–3 demo sites.

**NG5:** Biometric attendance.

**NG6:** Multilingual/conversational interface.

**NG7:** Contractor management module.

**NG8:** GIS mapping and OCR document digitization are stretch goals, not committed MVP scope — built only if Phases 1–4 (Section 8) complete on schedule.

These non-goals are deliberate scoping decisions, not omissions — each has a stated rationale in `MVP-IMPLEMENTATION-SPEC.md` Section 10, and should be treated as agreed unless explicitly revisited.

---

## 4. Users and Roles

| Role | Who they are | Primary need |
|------|-------------|-------------|
| **Field Officer** | On-site inspector/safety officer | Fast, reliable, offline-capable way to log inspections/incidents/attendance from the field |
| **Mine Official** | Site-level operational manager | Real-time visibility into their site's compliance status and open issues; ability to act on alerts |
| **Corporate Manager** | Subsidiary/corporate-level management | Cross-site visibility, trend awareness, escalation visibility for critical issues |
| **Regulator** | External regulatory authority | Read-only visibility into compliance status and statutory reporting, without operational noise |

---

## 5. Functional Requirements

### FR1 — Authentication & Roles

Users log in via email/password (JWT-based).

Every user has exactly one role (`field_officer`, `mine_official`, `corporate_manager`, `regulator`) and, where applicable, one associated site.

All API responses are scoped server-side by role — a role never receives data it isn't entitled to, regardless of what the client requests.

### FR2 — Field Data Capture (Mobile)

Field officers can submit: safety/environmental/production/labour inspections (checklist-based), incidents (severity-tagged, with description and photos), and attendance (geo-stamped check-in/out).

All forms function fully offline; data queues locally and syncs when connectivity returns.

Every submitted record is geo-tagged and timestamped at the point of capture (device-local time), not at sync time.

Duplicate submissions (e.g., from app retry after crash) must not create duplicate server-side records.

### FR3 — Centralized Dashboard

Each role sees a dashboard view scoped to their needs (see Section 4 and `MVP-IMPLEMENTATION-SPEC.md` Section 4.3 for exact response shapes).

Dashboard reflects alert and workflow state in near-real-time via Socket.io push, without requiring manual refresh.

Mine officials see site-level detail; corporate managers see cross-site summaries and critical alerts; regulators see compliance/statutory status only.

### FR4 — Compliance Risk & Anomaly Detection

The system evaluates every new inspection/incident/attendance record against a defined rule set (Section 5, `MVP-IMPLEMENTATION-SPEC.md`) immediately upon sync.

A scheduled batch process additionally checks for repeat violations, overdue inspections, and attendance anomalies at fixed intervals.

Every detected issue creates an Alert with a severity level and routes to the correct stakeholder per the routing table already defined.

### FR5 — Automated Workflow & Escalation

Every alert has an assigned owner and a deadline based on severity.

If unresolved past deadline, the alert automatically escalates to the next stakeholder tier and the deadline resets.

Alerts can be manually acknowledged or resolved by an authorized user at any point, which halts further auto-escalation.

Overdue, unresolved alerts remain visible to regulators as a compliance-gap indicator.

### FR6 — Audit Trail

Every write action (record creation, alert status change, workflow transition) is logged to an append-only, hash-chained audit log.

Audit log entries are never updated or deleted through any application code path.

Tampering with historical data is detectable by re-verifying the hash chain.

### FR7 — Statutory Reporting

Authorized users can generate a statutory report for a given site, type, and date range, compiled on-demand from underlying operational data (not a separately maintained copy of the truth).

### FR8 (Stretch) — GIS Visualization

Dashboard can optionally display inspection/incident locations on a map, using existing location data already captured in FR2 — no new data model required.

### FR9 (Stretch) — OCR Document Ingestion

Users can upload a photo of a paper inspection/compliance form; the system attempts to extract structured fields via OCR, flagging low-confidence extractions for manual review.

---

## 6. Non-Functional Requirements

| Requirement | Definition |
|-------------|-----------|
| Offline resilience | Mobile app must remain fully usable with zero connectivity; no data loss on sync failure or app crash |
| Data integrity | No duplicate records from retried syncs; audit trail must be tamper-evident |
| Role-based access control | Enforced server-side on every endpoint, not just hidden in the UI |
| Real-time responsiveness | Dashboard alert updates should appear within seconds of the triggering event, given connectivity |
| Scalability (demo-level) | Must support at least 3 sites, ~50 concurrent field records/day, without performance degradation — full production-scale load is out of scope for MVP |
| Security | Passwords hashed (bcrypt); JWT-based session auth; no plaintext credentials anywhere |
| Explainability | Every alert must be traceable to the specific rule and record that triggered it — no black-box detection, consistent with rule-based (non-ML) scoping |

---

## 7. Success Metrics (MVP / Demo Context)

Since this is a hackathon MVP rather than a production rollout, success is measured by demonstrated capability, not live usage volume:

- The full loop (offline capture → sync → rule-triggered alert → role-based dashboard update via socket → escalation on missed deadline → resolution) works end-to-end without manual intervention.
- Zero data loss or duplication demonstrated across an offline → online sync cycle.
- Audit trail correctly detects a simulated tampering attempt (hash chain breaks as expected).
- All three dashboard roles show correctly scoped, distinct views from the same underlying data.
- Deployed (not just local) version functions identically to local dev version during the demo.

---

## 8. Build Plan Reference

Detailed data models, API contracts, rule engine logic, workflow state machine, and a week-by-week phased build order (6-week SIH timeline, team-role suggestions) are fully specified in `MVP-IMPLEMENTATION-SPEC.md`, Sections 3–9. This PRD does not duplicate that detail — it is the "why/what," `MVP-IMPLEMENTATION-SPEC.md` is the "how."

---

## 9. Open Risks

| Risk | Mitigation |
|------|-----------|
| Offline sync edge cases (partial photo upload, app killed mid-sync) not fully tested before demo | Budget explicit test time in Phase 5/6 for "airplane mode" demo scenario, per `MVP-IMPLEMENTATION-SPEC.md` Section 8 |
| Rule engine false positives/negatives if thresholds are unrealistic | Use seed/demo data to validate each rule fires correctly before final demo, not just in isolated unit tests |
| Judges question "AI-enabled" claim given no ML model | Prepared, honest explanation ready (Section 3.2 rationale) — framed as a deliberate engineering trade-off, not a shortcut |
| Scope creep into stretch goals (GIS/OCR) before core loop is solid | Explicit cut-list discipline per `MVP-IMPLEMENTATION-SPEC.md` Section 10 — core loop must be demo-ready before any stretch work starts |

---

## 10. Approval

This PRD reflects decisions already agreed across `PROJECT-UNDERSTANDING.md` and `MVP-IMPLEMENTATION-SPEC.md`. Any change to Sections 3, 5, or 6 should be treated as a scope change requiring explicit team sign-off, since downstream implementation (schemas, API contracts, rule logic) is already written against this scope.
