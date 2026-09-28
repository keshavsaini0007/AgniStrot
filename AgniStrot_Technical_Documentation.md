# AgniStrot

## AI-Based Smart Governance and Compliance Monitoring System for Coal Mines

**Technical Project Documentation**

| | |
|---|---|
| Project | AgniStrot (SIH26024) |
| Organization | Ministry of Coal, Coal India Limited |
| Theme | Smart Automation |
| Stack | React, Node.js, Express, MongoDB, React Native (Expo) |
| Version | 1.0 |
| Date | September 2026 |

---

## Table of Contents

1. Executive Summary
2. Problem Statement
3. Solution Overview
4. User Roles and System Capabilities
5. Functional Architecture
6. System Architecture
7. Technology Stack
8. Backend Architecture
9. Frontend Architecture
10. Mobile Application Architecture
11. Database Architecture
12. Authentication and Authorization
13. Security and Data Protection
14. AI Risk Scoring Engine
15. Automated Scheduling System
16. Medical Report Processing Pipeline (OCR)
17. AI Integration
18. Event-Driven Architecture
19. SLA Management Engine
20. Evidence Integrity System
21. Geospatial Risk Intelligence
22. Testing and Reliability
23. Deployment Architecture
24. Engineering Challenges
25. Professional Engineering Skills Demonstrated
26. Technical Decisions and Trade-offs
27. Project Maturity Assessment
28. Final Project Summary

---

## 1. Executive Summary

AgniStrot is a modular, event-driven governance and safety platform for coal-mine operations. It combines compliance management, field intelligence, hazard management, configurable workflows, geospatial risk visualization, explainable risk analytics, evidence integrity, offline synchronization, role-resource-based authorization, and production-oriented observability into a unified system.

The platform addresses a critical gap in Indian coal mining operations: fragmented, paper-based governance processes across multiple mines, subsidiaries, departments, and regulatory stakeholders. Information silos lead to delayed reporting, missed compliance deadlines, undetected recurring violations, and weak field-level visibility.

AgniStrot replaces these fragmented processes with a centralized digital ecosystem accessible via web dashboard and mobile field application. The system serves four primary roles: field officers performing on-site inspections, mine officials managing site-level compliance, corporate managers overseeing cross-mine operations, and regulators requiring read-only compliance visibility.

**Core Capabilities:**

- Role-based access control with resource-level scoping across four user roles
- Real-time compliance monitoring with automated alert generation and escalation
- Geo-tagged field data capture with offline-first mobile architecture
- Explainable AI risk scoring with weighted multi-factor analysis
- Hash-chained immutable audit trail with tamper detection
- Event-driven domain architecture with outbox pattern for reliable async processing
- OCR document ingestion with structured field extraction
- GIS-based risk heatmap visualization with geofencing
- Evidence integrity verification using SHA-256 checksums
- Configurable SLA engine with multi-level escalation matrices

**Technology Stack:** React and Vite for the web dashboard, React Native with Expo for the mobile application, Node.js and Express for the REST API backend, MongoDB with Mongoose for data persistence, Socket.io for real-time communication, and Cloudinary for cloud file storage.

---

## 2. Problem Statement

### 2.1 The Governance Challenge

Coal mining operations in India involve multiple mines operating under various subsidiaries, each with distinct departments, contractors, field personnel, corporate teams, and regulatory stakeholders. Governance activities span statutory compliance tracking, safety inspections, environmental monitoring, production reporting, labour records, contractor obligations, and corrective action management.

These activities currently operate across disconnected systems: paper documents, spreadsheets, email chains, messaging applications, and separate reporting tools. The result is a fragmented information landscape where answering a basic question such as "Which mines have serious compliance issues right now?" requires collecting data from multiple sources.

### 2.2 Core Problems

| Problem | Description | Impact |
|---------|-------------|--------|
| Fragmented Information | Activities recorded in separate systems, spreadsheets, and documents | Cross-module analysis becomes impractical |
| Manual Compliance Tracking | Due dates and evidence monitored through spreadsheets and manual reminders | Missed deadlines, compliance gaps |
| Delayed Escalation | Serious observations depend on manual communication to reach decision-makers | Response times measured in days rather than hours |
| Weak Field Visibility | Management lacks immediate access to where, when, and what evidence was captured | Inability to verify field activity |
| Repeated Violations | Without historical analytics, recurring issues treated as isolated incidents | Systemic problems go unaddressed |
| Limited Management Visibility | Senior management needs summarized views, not individual reports | Slow, report-dependent decision-making |
| Accountability Gaps | Responsibilities communicated through informal channels | Ownership and closure history difficult to audit |
| Connectivity Constraints | Field personnel operate in areas with intermittent network | Data capture blocked during connectivity loss |

### 2.3 Root Cause Analysis

```
Fragmented Processes ──────┐
                           ├──> Data Silos ──> Low Real-Time Visibility
Manual Documentation ──────┘                        │
                                                     ├──> Delayed Decision Making
Limited Field Connectivity ──> Delayed Updates ─────┘          │
                                                                 ▼
                                                          Higher Governance Risk
```

### 2.4 Affected Stakeholders

| Stakeholder | Primary Problem |
|-------------|----------------|
| Field Inspector | Manual reporting with weak follow-up mechanisms |
| Mine Officer | Scattered tasks across multiple compliance items and systems |
| Department Head | Difficulty prioritizing across competing obligations |
| Corporate Management | Delayed visibility across multiple mine sites |
| Contractor | Unclear ownership of corrective action responsibilities |
| Auditor | Difficult historical reconstruction of governance events |
| Regulatory Authority | Need for structured, reliable, auditable compliance information |

---

## 3. Solution Overview

### 3.1 Platform Concept

AgniStrot functions as a centralized digital control room for mine governance. Instead of asking "Where is the latest report?" the organization asks "What is overdue, what is high risk, who is responsible, what evidence exists, and what needs attention now?"

The platform connects mine-level field activities, statutory compliance, inspections, observations, corrective actions, contractor responsibilities, GIS information, alerts, analytics, and management dashboards into a single role-aware system.

### 3.2 Five System Components

1. **Centralized Dashboard** - Real-time compliance and operational view with role-based filtering
2. **AI and Analytics Engine** - Detects compliance risks, anomalies, and recurring violations through explainable scoring
3. **Geo-Tagged Mobile Application** - Field inspections, safety observations, attendance capture, incident reporting with offline capability
4. **Automated Workflow System** - Alerts, reminders, escalations, digital approvals with configurable SLA matrices
5. **Digital Infrastructure Layer** - GIS mapping, OCR document digitization, hash-chained audit trails, evidence integrity verification

### 3.3 Core Workflows

**Compliance Monitoring Flow:**

```
Compliance Requirement -> Set Due Date -> Assign Responsible Officer -> Monitor Status
        |                                                           |
        |                                                Deadline Approaching?
        |                                                           |
        |                                                  Yes -> Reminder -> Completed?
        |                                                           |              |
        |                                                    No -> Escalation   Yes -> Evidence
        |                                                           |              |
        |                                                  Management Alert    Verification -> Closed
```

**Inspection Flow:**

```
Schedule Inspection -> Assign Inspector -> Field Visit -> Capture Data (GPS + Photos)
        |                                                         |
        |                                                    Submit Inspection
        |                                                         |
        |                                                    Generate Observations
        |                                                         |
        |                                              Violation Detected?
        |                                                    |          |
        |                                                   No        Yes
        |                                                    |          |
        |                                          Close Inspection   Create Corrective Action
        |                                                                   |
        |                                                            Assign Responsible Officer
        |                                                                   |
        |                                                            Resolve -> Verify -> Close
```

**Alert Lifecycle:**

```
Alert Created -> Assigned -> Deadline Passed? -> Reminded -> Deadline + 25%? -> Escalated -> Resolved
                     |            |                  |              |
                     |           No                 No            Yes
                     |            |                  |              |
                     |        Stay Assigned      Stay Reminded   Escalate
                     |
                     +-> Acknowledged -> Auto-Escalation Halted
```

### 3.4 End-to-End Demonstration Flow

```
Inspector submits safety observation (mobile)
        |
        v
Backend validates and stores report + GPS + evidence
        |
        v
AI engine calculates risk score (explainable multi-factor)
        |
        v
High-risk result triggers alert creation
        |
        v
Alert assigned to mine official with deadline
        |
        v
Real-time notification via Socket.io
        |
        v
Mine officer assigns corrective action
        |
        v
Responsible officer resolves, uploads evidence
        |
        v
Verifier approves, incident closed
        |
        v
Dashboard metrics update in real-time
```

---

## 4. User Roles and System Capabilities

### 4.1 Role Definitions

| Role | Identity | Primary Functions | Data Scope |
|------|----------|-------------------|------------|
| Field Officer | On-site inspector or safety officer | Log inspections, incidents, attendance from the field with GPS and photo evidence | Own submissions and assigned corrective actions |
| Mine Official | Site-level operational manager | Monitor site compliance, manage corrective actions, respond to alerts | Single mine site data |
| Corporate Manager | Subsidiary or corporate-level management | Cross-site visibility, trend analysis, escalation oversight | All mine sites within scope |
| Regulator | External regulatory authority | Read-only compliance and inspection visibility | Compliance and statutory status only |

### 4.2 Permission Matrix

| Capability | Field Officer | Mine Official | Corporate Manager | Regulator |
|------------|:---:|:---:|:---:|:---:|
| Submit inspections | Yes | Yes | No | No |
| Submit incidents | Yes | Yes | No | No |
| Record attendance | Yes | Yes | No | No |
| View own site data | Yes | Yes | No | No |
| View all sites data | No | No | Yes | Read-only |
| Manage corrective actions | Assigned only | All site actions | Cross-site view | Read-only |
| View compliance register | Own site | Own site | All sites | All sites |
| View dashboards | Own site | Own site | Cross-site | Compliance only |
| View audit logs | No | Own site | All sites | All sites |
| Manage users | No | No | Yes | No |
| Configure escalation rules | No | No | Yes | No |
| Generate reports | Own site | Own site | All sites | Compliance only |
| View analytics | Own site | Own site | Cross-site | Compliance trends |

### 4.3 Data Scoping Enforcement

All API responses are scoped server-side by role. A field officer never receives data belonging to another site. A regulator never sees operational details beyond compliance status. Corporate managers receive aggregated cross-site summaries rather than raw operational records. This scoping is enforced through middleware before controller logic executes, ensuring no client-side manipulation can bypass access restrictions.

---

## 5. Functional Architecture

### 5.1 Authentication Module

**Purpose:** Secure user registration and session management with JWT-based tokens.

**User Interaction:** Users register with name, email, password, and role. Login returns a signed JWT containing user ID, role, and site assignment. Tokens expire after a configurable period and require re-authentication.

**Backend Responsibility:** Password hashing with bcryptjs, JWT signing and verification, token expiry enforcement, role validation.

**Data Involved:** User credentials, role assignments, site associations, token metadata.

### 5.2 Mine Management Module

**Purpose:** Maintain operational profiles for each mine site including location, subsidiary, departments, and responsible officers.

**User Interaction:** Corporate managers create and configure mine sites. Field officers and mine officials view their assigned site details.

**Data Involved:** Site name, subsidiary, GPS coordinates, expected worker count, department associations, officer assignments.

### 5.3 Inspection Management Module

**Purpose:** Support structured field inspections with checklist-based forms, photo evidence, and GPS tagging.

**User Interaction:** Field officers create inspections by selecting type (safety, environmental, production, labour), completing checklist items (pass/fail/na), capturing photos, and submitting with automatic GPS coordinates and device-local timestamps.

**Backend Responsibility:** Validate checklist structure, store inspection with client UUID for deduplication, trigger rule engine evaluation, generate audit log entry.

**Data Involved:** Inspection type, checklist items with results, photo URLs, GPS coordinates, capture timestamp, sync timestamp, inspector reference, site reference.

### 5.4 Incident Reporting Module

**Purpose:** Capture safety and operational incidents with severity classification, category tagging, and evidence attachment.

**User Interaction:** Field officers describe incidents, select severity (low/medium/high/critical) and category (safety/environmental/equipment/other), attach photos, and submit with GPS and timestamp.

**Backend Responsibility:** Store incident, evaluate severity-based rules, trigger alerts for critical incidents, create audit trail entries.

### 5.5 Attendance Tracking Module

**Purpose:** Record worker check-in and check-out with geo-stamped verification.

**User Interaction:** Field officers record attendance by selecting worker reference, check type (in/out), and capturing GPS location.

**Backend Responsibility:** Store attendance records with client UUID deduplication, feed data to batch anomaly detection rules.

### 5.6 Alert and Notification Module

**Purpose:** Generate, route, and manage alerts based on rule evaluation results.

**User Interaction:** Users receive real-time alerts via Socket.io and view alert history in the dashboard. Mine officials acknowledge or resolve alerts. Escalation occurs automatically when deadlines pass.

**Backend Responsibility:** Create alerts atomically via upsert with rule key deduplication, assign to appropriate stakeholders, manage workflow state transitions, emit Socket.io events for real-time delivery.

### 5.7 Corrective Action Module

**Purpose:** Track the lifecycle of corrective actions from assignment through resolution and verification.

**User Interaction:** Responsible officers update action status, upload resolution evidence, and submit for verification. Verifiers approve or reject with comments.

**Workflow States:** Open, Assigned, In Progress, Resolved, Verified (Accepted or Rejected), Closed.

### 5.8 Compliance Register Module

**Purpose:** Maintain a digital register of statutory compliance requirements with due dates, responsible persons, and evidence.

**User Interaction:** Compliance items are created with requirement descriptions, categories, due dates, and assigned owners. Status updates track progress from pending through compliant or overdue.

### 5.9 Document Management Module

**Purpose:** Store and manage documents associated with compliance items, inspections, and corrective actions.

**User Interaction:** Users upload documents through the web or mobile interface. OCR processing extracts structured fields from scanned forms.

**Backend Responsibility:** Upload to Cloudinary, store metadata in database, trigger OCR extraction when applicable, manage document review workflow.

### 5.10 GIS and Risk Visualization Module

**Purpose:** Provide map-based visualization of mine locations, inspection sites, incident locations, and risk hotspots.

**User Interaction:** Users view interactive maps with markers for sites, inspections, and incidents. Risk heatmap overlay shows concentration of issues by area.

**Backend Responsibility:** Serve geospatial marker data, aggregate risk by location, support geofencing validation for submitted records.

### 5.11 AI Risk Scoring Module

**Purpose:** Calculate explainable risk scores for mine sites based on historical and current data patterns.

**User Interaction:** Dashboards display risk scores with factor breakdowns showing exactly which contributions raised or lowered the score.

**Backend Responsibility:** Aggregate alerts, inspections, and incidents over 30-day windows. Apply weighted scoring algorithm. Classify risk levels. Provide trend analysis with period-over-period comparison.

### 5.12 Reporting Module

**Purpose:** Generate compliance, inspection, violation, corrective action, and risk reports for specified date ranges and mine sites.

**User Interaction:** Authorized users select report type, date range, and scope. Reports compile from underlying operational data.

**Backend Responsibility:** Query and aggregate data, compile report structures, generate PDF output via pdfkit.

### 5.13 Audit Trail Module

**Purpose:** Maintain an immutable, hash-chained record of all governance-relevant actions.

**User Interaction:** Authorized users browse audit logs with filtering by actor, action, entity, date, and module. Verification tools confirm chain integrity.

**Backend Responsibility:** Append-only log writes with SHA-256 hash chaining. Each entry stores the hash of the previous entry, creating a tamper-evident chain. Any modification to historical entries breaks the chain and is detectable.

---

## 6. System Architecture

### 6.1 High-Level Architecture

```
                        AGNISTROT
                           |
          +----------------+----------------+
          |                |                |
       Web App         Mobile App       API Clients
     (React/Vite)   (React Native)         |
          |                |                |
          +----------------+----------------+
                           |
                    API GATEWAY / REST API
                           |
                 +---------+---------+
                 |                   |
              Auth/RBAC          Validation
                 |                   |
                 +---------+---------+
                           |
                     DOMAIN SERVICES
                           |
       +---------+---------+---------+---------+
       |         |         |         |         |
   Compliance Inspection Incident  Hazard  Equipment
       |         |         |         |         |
       +---------+---------+---------+---------+
                           |
                     DOMAIN EVENTS
                           |
                 +---------+---------+
                 |                   |
              OUTBOX             WORKERS
                 |                   |
                 |       +----------+----------+
                 |       |          |          |
                 |      Risk       SLA    Notification
                 |       |          |          |
                 |      AI     Escalation     Email
                 |
                 v
              MONGODB
                 |
       +---------+---------+
       |         |         |
    Audit     Analytics  Evidence
    Chain     Engine     Storage
       |         |         |
       +---------+---------+
                           |
                    OBSERVABILITY
                 +---------+---------+
                 |         |         |
               Logs     Metrics   Tracing
```

### 6.2 Request Lifecycle

```
HTTP Request
     |
     v
Express Route
     |
     v
CORS + Helmet Security Headers
     |
     v
Request Correlation ID Assignment
     |
     v
Rate Limit Check
     |
     v
JWT Authentication Middleware
     |
     v
RBAC Authorization Middleware (Role + Resource Scope)
     |
     v
Input Validation (Zod Schema)
     |
     v
Controller
     |
     v
Service Layer
     |
     v
Domain Event Emission (Outbox Pattern)
     |
     v
Mongoose Model / MongoDB
     |
     v
Response Serialization
     |
     v
Audit Log Entry (Hash-Chained)
     |
     v
JSON Response to Client
```

### 6.3 Real-Time Communication

Socket.io provides live dashboard updates. When alerts are created or escalated, the server emits events to connected clients scoped by site. Dashboard components subscribe to these events and update metrics without requiring manual refresh.

Events: `alert:new`, `alert:escalated`, `alert:acknowledged`, `alert:resolved`, `inspection:created`, `incident:created`.

### 6.4 Background Processing

A cron scheduler executes batch operations every 15 minutes:

1. **Batch Rules** - Overdue inspection detection, attendance anomaly detection, repeat violation identification
2. **Workflow Escalation** - State transitions for alerts approaching or exceeding deadlines
3. **SLA Monitoring** - Breach detection and escalation matrix evaluation
4. **Worker Health Check** - Dead letter queue inspection and retry processing

All background operations are idempotent by design, using upsert operations and state-transition guards to prevent duplicate processing.

---

## 7. Technology Stack

### 7.1 Frontend (Web Dashboard)

| Technology | Category | Purpose |
|------------|----------|---------|
| React 18+ | UI Framework | Component-based dashboard rendering with role-scoped views |
| Vite | Build Tool | Fast development server and optimized production builds |
| Tailwind CSS | Styling | Utility-first CSS for consistent, responsive design |
| React Router | Navigation | Client-side routing with protected route guards |
| Axios | HTTP Client | API communication with interceptors for token injection |
| Zustand | State Management | Lightweight global state for auth, theme, UI preferences |
| React Query | Server State | Data fetching, caching, and synchronization with stale-time management |
| Recharts | Visualization | Charts for compliance trends, risk distribution, analytics |
| Leaflet / React Leaflet | GIS | Interactive map rendering with OpenStreetMap tiles |
| Socket.io Client | Real-time | Live alert and dashboard update subscriptions |
| Framer Motion | Animation | Page transitions and scroll-reveal animations |

### 7.2 Mobile Application (App-frontend)

| Technology | Category | Purpose |
|------------|----------|---------|
| React Native (Expo SDK 57) | Mobile Framework | Cross-platform iOS and Android field application |
| Zustand | State Management | Client-side auth and UI state |
| React Query | Server State | API data management with offline awareness |
| Axios | HTTP Client | Backend communication with Bearer token |
| AsyncStorage | Persistence | Local data queue for offline submissions |
| Expo Location | Geolocation | GPS coordinate capture at submission time |
| Expo Camera | Media | Photo evidence capture with metadata |

### 7.3 Backend

| Technology | Category | Purpose |
|------------|----------|---------|
| Node.js | Runtime | JavaScript execution environment |
| Express 5 | Web Framework | REST API routing, middleware, and request handling |
| MongoDB | Database | Document-based data persistence for diverse record types |
| Mongoose 9 | ODM | Schema definition, validation, and query building |
| JWT (jsonwebtoken) | Authentication | Stateless token-based session management |
| bcryptjs | Security | Password hashing with configurable salt rounds |
| Zod | Validation | Runtime type checking and input sanitization |
| Socket.io | Real-time | Bidirectional event communication for live dashboards |
| node-cron | Scheduling | Cron-based background task execution |
| Cloudinary | File Storage | Cloud-based image and document storage |
| Tesseract.js | OCR | Optical character recognition for scanned documents |
| pdfkit | Reports | Server-side PDF document generation |
| Helmet | Security | HTTP security headers |
| uuid | Utilities | UUID generation for client-side deduplication keys |

### 7.4 Testing

| Technology | Category | Purpose |
|------------|----------|---------|
| Jest | Test Runner | Unit and integration test execution |
| Supertest | API Testing | HTTP endpoint testing |
| Newman | API Verification | Postman collection execution for endpoint validation |

### 7.5 External Services

| Service | Purpose |
|---------|---------|
| Cloudinary | Image and document cloud storage with transformation |
| OpenStreetMap | Map tile provider for GIS visualization |
| Tesseract.js | Client-side OCR engine for document field extraction |

### 7.6 Hosting and Deployment

| Component | Platform | Purpose |
|-----------|----------|---------|
| Frontend | Vercel | Static hosting with CDN distribution |
| Backend | Render | Node.js application hosting |
| Database | MongoDB Atlas | Managed MongoDB with free tier |
| File Storage | Cloudinary | Managed media storage |

---

## 8. Backend Architecture

### 8.1 Project Structure

```
backend/src/
    config/           -- Database and service configuration
    controllers/      -- Request handling and response formatting
    middleware/        -- Authentication, authorization, validation
    models/           -- Mongoose schema definitions
    routes/           -- Express route definitions
    services/         -- Business logic and domain operations
    sockets/          -- Socket.io event handling
    types/            -- Shared TypeScript interfaces
    utils/            -- Role scoping and helper functions
    validators/       -- Zod validation schemas
    scripts/          -- Seed data, verification, audit trail checks
    server.ts         -- Application entry point
```

### 8.2 Layered Architecture

The backend follows a strict layered architecture:

- **Routes** define HTTP endpoints and map them to controllers. They apply authentication and validation middleware.
- **Middleware** handles cross-cutting concerns: JWT verification, role-based authorization, request validation, rate limiting, security headers.
- **Controllers** parse request parameters, call service methods, and format responses. They contain no business logic.
- **Services** implement business logic, domain rules, and data orchestration. They interact with Mongoose models and other services.
- **Models** define Mongoose schemas with validation rules, indexes, and relationship references.

This separation ensures that business logic remains independent of HTTP transport, making services testable in isolation and controllers focused on request/response translation.

### 8.3 API Design

All endpoints follow RESTful conventions under the `/api/v1/` prefix. Unversioned aliases (`/auth`, `/inspections`, etc.) provide backward compatibility.

**Response Formats:**

List responses include pagination metadata:
```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

Detail responses return a single resource:
```json
{ "data": { ... } }
```

Error responses include descriptive messages:
```json
{ "error": "Error message" }
```

Validation errors include field-level details:
```json
{
  "error": "Validation failed",
  "details": [{ "field": "email", "message": "Invalid email format" }]
}
```

### 8.4 Validation

Zod schemas validate all incoming requests before controller execution. Schemas define expected types, required fields, string patterns, numeric ranges, and enum values. Invalid requests receive structured error responses with field-level messages. Validation middleware sits between route definition and controller invocation.

### 8.5 Error Handling

The Express error handler catches unhandled exceptions and formats them as structured JSON responses. Database errors, authentication failures, and validation errors are distinguished and returned with appropriate HTTP status codes. Internal error details are not exposed to clients in production.

---

## 9. Frontend Architecture

### 9.1 Application Structure

```
frontend/src/
    api/              -- Axios client, endpoints, Socket.io, token management
    components/       -- Reusable UI components organized by domain
    contexts/         -- React context providers (Socket.io)
    hooks/            -- Custom React hooks for data fetching
    layouts/          -- Page layout wrappers (public, authenticated)
    pages/            -- Route-level page components
    routes/           -- Protected route guards
    store/            -- Zustand state stores
    utils/            -- Security helpers, status formatters
```

### 9.2 Component Architecture

Components follow a domain-organized structure:

- **ui/** - Generic reusable components: Button, Card, Modal, DataTable, Pagination, FilterBar, Badge, Input, Select, EmptyState, ErrorState, LoadingState, Skeleton
- **dashboard/** - KPI cards and summary widgets
- **analytics/** - Risk score cards, compliance trend charts
- **compliance/** - Compliance overview components
- **gis/** - Mine map, list panel, marker components
- **mines/** - Stat cards for mine detail views
- **notifications/** - Notification item rendering
- **layout/** - Sidebar navigation, top bar, page headers
- **animations/** - Scroll reveal, text reveal, parallax, counter animations

### 9.3 State Management

**Zustand** manages client-side state: authentication session, theme preferences, UI state (sidebar collapsed, modal open).

**React Query** manages server-side state: API data fetching, caching with 5-minute stale time, automatic refetching, and optimistic updates.

**Socket Context** provides real-time event subscription to all dashboard components.

### 9.4 Navigation and Routing

Public routes (landing page, login, register) render within a `PublicLayout`. Protected routes require authenticated access via `ProtectedRoute` guard and render within `AppLayout` with sidebar navigation.

Route hierarchy:
```
/ (public)                -- Landing page
/login                    -- Authentication
/register                 -- Account creation
/app/dashboard            -- Main dashboard
/app/mines                -- Mine list
/app/mines/:mineId        -- Mine detail
/app/inspections          -- Inspection list
/app/inspections/:id      -- Inspection detail
/app/incidents            -- Incident list
/app/incidents/:id        -- Incident detail
/app/alerts               -- Alert management
/app/attendance           -- Attendance records
/app/corrective-actions   -- Action tracking
/app/compliance           -- Compliance register
/app/documents            -- Document management
/app/analytics            -- Risk analytics
/app/gis                  -- Map visualization
/app/reports              -- Report generation
/app/notifications        -- Notification center
/app/users                -- User management
/app/audit-logs           -- Audit trail
/app/settings             -- System settings
```

---

## 10. Mobile Application Architecture

### 10.1 Architecture Overview

The mobile application follows an offline-first architecture designed for field environments with intermittent connectivity. The core design principle is that field officers must never lose data due to connectivity issues.

```
Screen -> Hook (React Query) -> Service -> Repository (API)
                                            |
                                     OfflineQueue (AsyncStorage)
                                            |
                                     Envelope Adapter
                                            |
                                     Backend API
```

### 10.2 Repository Pattern

The application uses a repository pattern with a toggle between mock and live API implementations:

- `src/repositories/mock/` - Mock repositories returning deterministic data for development and offline scenarios
- `src/repositories/api/` - Live API repositories communicating with the backend
- `src/repositories/index.ts` - Single switch point that determines which implementation is active

Services and screens remain identical regardless of which repository implementation is active. The switch happens in one location.

### 10.3 Offline Synchronization

When the device lacks connectivity, submissions are queued locally using AsyncStorage. Each queued record includes:

- Client-generated UUID for deduplication
- Device-local timestamp (capture time, not sync time)
- GPS coordinates captured at submission
- Complete record payload

When connectivity restores, the queue syncs to the backend. The backend uses `clientUuid` as a deduplication key, ensuring retried submissions do not create duplicate records.

### 10.4 Conflict Resolution

When the same record is modified both offline and online before sync, the system detects the conflict through version tracking:

```
Client Version: 6
Server Version: 7
Conflict detected

Resolution options:
- Server wins (default for non-critical data)
- Device wins (requires explicit user action)
- Manual merge (for sensitive records)
```

Conflict resolution presents the user with a clear comparison interface showing both versions side by side.

### 10.5 Geo-Tagged Submissions

Every field submission captures GPS coordinates and a device-local timestamp at the moment of capture. This information is stored with the record and synced to the server. The server records both the capture timestamp and the sync timestamp separately, preserving the actual time of field observation regardless of connectivity delays.

### 10.6 Authentication Flow

The mobile application stores the JWT token in secure storage. On application launch, the token is validated by decoding the JWT payload client-side (no `/auth/me` endpoint required for MVP). On 401 responses, the token is cleared and the user is redirected to login. Logout is client-side only, clearing stored token and state.

---

## 11. Database Architecture

### 11.1 Data Modeling Approach

MongoDB with Mongoose provides document-based persistence suited to the diverse record types in a governance platform. Schema flexibility accommodates varying inspection checklists, incident descriptions, and compliance requirements without rigid relational constraints.

### 11.2 Core Entities

**User** - Application users with role assignments and site associations. Passwords stored as bcrypt hashes. Corporate managers and regulators have null siteId to indicate cross-site access.

**Site** - Mine site profiles with geographic coordinates, subsidiary information, and operational metadata.

**Inspection** - Field inspection records with type classification, checklist items (item/result/notes), GPS coordinates, photo URLs, and dual timestamps (capturedAt for device time, syncedAt for server time). Client UUID enables offline deduplication.

**Incident** - Safety and operational incidents with severity classification (low/medium/high/critical), category tagging (safety/environmental/equipment/other), description, evidence attachment, and status tracking.

**Attendance** - Worker check-in/check-out records with geo-stamping and client UUID deduplication.

**Alert** - Generated alerts from rule evaluation. Each alert references its source (inspection/incident/attendance), the triggering rule code, severity, assignment, and status. The `ruleKey` field provides idempotent deduplication through a sparse unique index.

**WorkflowState** - Append-only log of alert lifecycle transitions. Each entry records the state, deadline, transition timestamp, and optional notes. Never mutated; only appended.

**AuditLog** - Hash-chained append-only audit trail. Each entry stores SHA-256 hashes of its own data and the previous entry, creating a tamper-evident chain.

**Document** - Uploaded documents with source image URL, OCR-extracted fields, confidence scores, and review status.

**Compliance** - Statutory compliance requirements with due dates, responsible persons, status tracking, and evidence references.

**CorrectiveAction** - Lifecycle-tracked actions assigned in response to observations and violations.

### 11.3 Entity Relationships

```
User --(performs)--> Inspection
User --(reports)--> Incident
User --(records)--> Attendance
User --(belongs_to)--> Site

Site --(has)--> Inspection
Site --(has)--> Incident
Site --(has)--> Attendance
Site --(has)--> Compliance

Inspection --(generates)--> Alert
Incident --(generates)--> Alert
Alert --(has)--> WorkflowState (multiple, append-only)
Alert --(creates)--> AuditLog (multiple)
```

### 11.4 Key Indexes

| Collection | Index | Purpose |
|------------|-------|---------|
| Alert | `ruleKey` (sparse unique) | Idempotent alert creation |
| Inspection | `clientUuid` (unique) | Offline sync deduplication |
| Incident | `clientUuid` (unique) | Offline sync deduplication |
| Attendance | `clientUuid` (unique) | Offline sync deduplication |
| AuditLog | `createdAt` | Chronological query performance |
| Various | `siteId` + date compound | Site-scoped date range queries |

### 11.5 Aggregation Pipelines

**Risk Score Calculation:** Aggregates alerts, inspections, and incidents over 30-day windows per site. Computes weighted scores across four dimensions (alert severity, inspection failures, incident severity, resolution rate) to produce a 0-100 risk score.

**Attendance Anomaly Detection:** Compares today's check-in count against a 14-day historical average per site. Flags deviations exceeding 30%.

**Repeat Violation Detection:** Groups alerts by site and rule code over 30-day windows. Identifies patterns with 3 or more occurrences of the same rule.

**Trend Analysis:** Compares current 30-day period against previous 30-day period for inspections, incidents, and alerts. Calculates percent change for each metric.

---

## 12. Authentication and Authorization

### 12.1 Authentication

**Registration:** Users provide name, email, password, and role. The backend hashes the password with bcryptjs (configurable salt rounds) and stores the user document.

**Login:** Email and password are validated against stored credentials. On success, a JWT is signed containing the user ID, role, and site ID. The token and user profile are returned to the client.

**Token Management:** The JWT is stored client-side and attached to all subsequent requests via the `Authorization: Bearer <token>` header. Axios request interceptors inject the token automatically.

**Token Expiry:** Tokens have a configurable expiration period. Expired tokens are rejected by the authentication middleware, requiring re-authentication.

**Password Security:** Passwords are never stored in plaintext. bcryptjs provides one-way hashing with configurable salt rounds. Password comparison occurs during login only.

### 12.2 Authorization

**Role-Based Access Control (RBAC):** Every protected endpoint applies authorization middleware that verifies the requesting user's role against the endpoint's required permissions.

**Resource-Level Scoping:** Beyond role verification, the system scopes data access by site. A mine official with `siteId: "abc"` can only query records where `siteId: "abc"`. Corporate managers with null siteId receive cross-site access. This scoping is applied at the query level, not through post-fetch filtering.

**Assignment-Based Access:** Some operations are restricted to the assigned user. A field officer can only update corrective actions assigned to them. Verification can only be performed by users with appropriate role and site assignment.

**Protected Operations:**

| Operation | Required Role | Additional Scope |
|-----------|---------------|------------------|
| Submit inspection | field_officer | Own site |
| View inspections | Any authenticated | Role-scoped (own site / all sites) |
| Acknowledge alert | mine_official | Assigned alerts only |
| Resolve alert | mine_official | Assigned alerts only |
| Verify corrective action | mine_official | Site scope |
| Manage users | corporate_manager | All sites |
| View audit logs | mine_official+ | Site-scoped or all sites |
| Configure escalation | corporate_manager | System-wide |

---

## 13. Security and Data Protection

### 13.1 Implemented Security Controls

| Control | Implementation | Scope |
|---------|---------------|-------|
| Password Hashing | bcryptjs with configurable salt rounds | All user credentials |
| JWT Authentication | Stateless token verification on every protected request | All API endpoints |
| RBAC | Server-side role verification middleware | All protected endpoints |
| Resource Scoping | Database query-level site filtering | All data access |
| Input Validation | Zod schema validation before controller execution | All incoming requests |
| Security Headers | Helmet.js HTTP header configuration | All responses |
| CORS | Origin-based cross-origin configuration | All requests |
| Rate Limiting | Per-route configurable request throttling | Sensitive endpoints |
| File Validation | Type, size, and extension checks on uploads | Media endpoints |
| Secrets Management | Environment variables for JWT secrets, database URIs, API keys | All configuration |
| Audit Logging | Hash-chained append-only log of all write actions | All mutations |
| File Storage | Cloudinary cloud storage (files not stored in database) | All uploads |
| Error Handling | Structured error responses without internal detail exposure | All error paths |

### 13.2 Security Event Tracking

The system tracks security-relevant events:

- `LOGIN_SUCCESS` / `LOGIN_FAILED` - Authentication attempts
- `TOKEN_REFRESHED` - Session continuation
- `ROLE_CHANGED` - Permission modifications
- `PERMISSION_DENIED` - Authorization failures
- `FILE_UPLOAD` - Document submissions
- `DATA_EXPORT` - Report generation

### 13.3 Planned Security Improvements

| Improvement | Priority | Rationale |
|-------------|----------|-----------|
| Multi-factor authentication (TOTP) | High | Additional protection for sensitive roles |
| Refresh token rotation | High | Shorter access token lifetime with server-side refresh management |
| Rate limiting by role | Medium | Different throttle limits per user role |
| Idempotency keys | Medium | Prevent duplicate processing for critical operations |
| Structured security logging | Medium | Centralized security event dashboard |
| Security headers hardening | Low | Additional CSP and frame protection headers |

---

## 14. AI Risk Scoring Engine

### 14.1 Design Philosophy

The AI layer prioritizes explainability over complexity. Every risk score can be traced to specific measurable factors. The system does not make autonomous decisions; it provides decision-support information to responsible personnel.

### 14.2 Scoring Algorithm

The risk score calculation operates on a 0-100 scale across four weighted dimensions:

**Alert Score (0-40 points):**
Each alert contributes severity-weighted points: critical = 10, high = 6, medium = 3, low = 1. Total capped at 40.

**Inspection Score (0-30 points):**
Failed checklist items contribute 2 points each across all inspections in the 30-day window. Total capped at 30.

**Incident Score (0-30 points):**
Each incident contributes severity-weighted points: critical = 10, high = 5, medium = 2, low = 1. Total capped at 30.

**Resolution Bonus (-0 to -20 points):**
The ratio of closed alerts to total alerts produces a bonus that reduces the risk score: `resolutionRate * 20`.

**Final Score:** `alertScore + inspectionScore + incidentScore - resolutionBonus`, clamped to 0-100.

### 14.3 Risk Level Classification

| Score Range | Risk Level | Interpretation |
|-------------|------------|----------------|
| 0-30 | LOW | Normal operational status |
| 31-50 | MEDIUM | Requires monitoring |
| 51-70 | HIGH | Requires attention |
| 71-100 | CRITICAL | Requires immediate action |

### 14.4 Data Sufficiency Handling

When insufficient data exists (fewer than 1 inspection or alert in the 30-day window), the risk floor is set to MEDIUM (31). This prevents false "safe" signals for sites with sparse reporting.

### 14.5 Trend Analysis

The trend engine compares current 30-day metrics against the previous 30-day period:

- Inspections: total count, pass/fail ratio, percent change
- Incidents: total count, critical count, resolved count, percent change
- Alerts: total count, open count, average resolution time (hours), percent change

### 14.6 Risk Explanation Format

```
WHY IS THIS MINE HIGH RISK?

Risk Score: 72

+18  6 high-severity incidents in 30 days
+14  7 failed inspection checklist items
+12  3 repeated violation patterns detected
+10  5 overdue corrective actions
-08  Strong resolution rate (85%)

Primary Contributors:
1. Repeated safety violations in transport area
2. Overdue corrective actions approaching breach
3. Increasing incident frequency trend
```

### 14.7 Statistical Anomaly Detection

Beyond point-in-time scoring, the system detects statistical anomalies:

- **Compliance Anomaly:** Current compliance rate deviates significantly from historical average (e.g., normally 90-95%, current 71%)
- **Incident Anomaly:** Incident frequency exceeds typical range (e.g., normally 2-4/week, current 13)
- **Resolution Anomaly:** Average resolution time significantly exceeds baseline (e.g., normally 18 hours, current 61 hours)

Detection uses mean, standard deviation, z-score, and moving average calculations without requiring machine learning models.

### 14.8 Risk Trend Forecasting

The system visualizes 30-day risk score progression as a trend line, identifying whether risk is increasing, stable, or decreasing. Contributing factors are annotated along the trend to show which metrics drove changes.

---

## 15. Automated Scheduling System

### 15.1 Batch Rules Engine

Runs every 15 minutes via node-cron. Evaluates three batch-level rules across all active sites:

**Overdue Inspection Detection:**
For each site, determines the last inspection date per type. Compares against mandated intervals (production: 1 day, safety: 7 days, environmental: 14 days, labour: 30 days). Generates HIGH-severity alerts for overdue types.

**Attendance Anomaly Detection:**
Compares today's check-in count against a 14-day historical daily average per site. Flags deviations exceeding plus or minus 30% as MEDIUM-severity alerts.

**Repeat Violation Detection:**
Groups all alerts from the last 30 days by site and rule code. Identifies patterns with 3 or more occurrences. Generates HIGH-severity alerts for repeat violations.

### 15.2 Workflow Escalation Engine

Runs alongside batch rules. Processes alert lifecycle transitions:

**Assigned to Reminded:** When an alert's original deadline has passed and the alert remains in "assigned" state, transitions to "reminded" with a console warning.

**Reminded to Escalated:** When the deadline plus 25% of the severity-specific window has elapsed and the alert remains in "reminded" state, transitions to "escalated" and updates the alert status. Emits Socket.io event for real-time notification.

**Guard Conditions:** Escalation is blocked if the alert status is "closed", "escalated", or "acknowledged". State transition guards ensure idempotency by verifying the expected predecessor state before allowing transition.

### 15.3 SLA Monitoring

The SLA engine evaluates configurable service level agreements against active alerts:

- Acknowledgement SLA: Time from alert creation to first user acknowledgement
- Resolution SLA: Time from alert creation to resolution
- Escalation Matrix: Configurable multi-level escalation paths per severity

### 15.4 Idempotency

All scheduled operations are idempotent. Alert creation uses `findOneAndUpdate` with upsert and `ruleKey` deduplication. State transitions verify the expected current state before applying changes. This ensures that scheduled jobs can safely re-execute without creating duplicates or corrupting state, even if a previous execution was interrupted.

---

## 16. OCR Document Processing Pipeline

### 16.1 Processing Flow

```
Document Upload
       |
       v
Cloudinary Storage (URL returned)
       |
       v
File Type Detection (image vs PDF)
       |
  +----+----+
  |         |
  v         v
Image      PDF
  |         |
  v         v
Tesseract.js    pdf-parse
  |         |
  +----+----+
       |
       v
Extracted Raw Text
       |
       v
Heuristic Field Extraction (regex patterns)
       |
       v
Structured Fields:
  - Form type (safety/environmental/production/labour)
  - Date (ISO and Indian format parsing)
  - Inspector name
  - Checklist items with pass/fail/na results
  - Remarks and notes
       |
       v
Confidence Score Calculation
       |
       v
Review Status Assignment:
  - High confidence -> Auto-populate, pending confirmation
  - Low confidence -> Flag for manual review
```

### 16.2 Tesseract.js Integration

The OCR service creates a per-request worker to avoid concurrent worker conflicts. Each extraction receives its own Tesseract worker, which is terminated after use to free resources.

The worker processes the image and returns raw text with word-level confidence scores. The average word confidence is computed and normalized to a 0-1 range.

### 16.3 Field Extraction Heuristics

Regex-based heuristics extract structured fields from OCR text:

- **Form Type:** Keyword matching for safety, environmental, production, labour categories
- **Date:** ISO format (YYYY-MM-DD) and Indian format (DD-MM-YYYY/DD/MM/YYYY) with automatic conversion
- **Inspector Name:** Pattern matching for "Inspector:", "Officer:", or "By:" followed by capitalized name
- **Checklist Items:** Line-by-line parsing for bullet points or numbered items with pass/fail/na indicators
- **Remarks:** Section extraction after "Remarks:", "Notes:", or "Comments:" headers

### 16.4 Confidence Handling

Extracted fields with high confidence scores are stored directly. Fields with low confidence are flagged for manual review through the document review workflow. Users can confirm, reject, or correct extracted fields before finalizing.

---

## 17. AI Integration

### 17.1 Medical Report Summarization (Document Processing)

The AI component processes uploaded documents through OCR extraction followed by structured field identification. The system does not provide medical advice; it converts unstructured document images into searchable, structured metadata.

**Input:** Uploaded image or PDF of inspection form, compliance document, or report.
**Processing:** OCR text extraction, regex-based field parsing, confidence scoring.
**Output:** Structured fields (form type, date, inspector, checklist results, remarks) with confidence scores and review status.

### 17.2 Risk Intelligence

The risk engine analyzes historical and current operational data to produce explainable risk assessments. This is the primary AI capability of the system.

**Input:** 30-day history of alerts, inspections, incidents, and corrective actions per site.
**Processing:** Weighted multi-factor scoring algorithm with severity, frequency, and resolution rate analysis.
**Output:** Risk score (0-100), risk level classification, factor breakdown with explanations, trend analysis.

### 17.3 Anomaly Detection

Statistical methods identify unusual patterns without requiring trained models.

**Input:** Historical baseline metrics (daily averages, typical ranges).
**Processing:** Deviation calculation using mean, standard deviation, and threshold comparison.
**Output:** Anomaly flags with deviation magnitude and affected metric identification.

### 17.4 Natural-Language Query Interface

The system supports controlled natural-language queries against operational data:

```
User Question: "Which mines have the most unresolved high-risk issues?"

Processing:
  Intent Parser -> Allowed Query Schema -> MongoDB Aggregation -> Result + Explanation
```

Queries are restricted to pre-defined, safe operations. The system does not provide arbitrary database access through natural language.

### 17.5 AI Positioning

The AI components function as decision-support tools, not autonomous authorities. Every AI-generated output includes traceable explanations. Risk scores show contributing factors. Anomaly detections show deviation magnitudes. The system assists human decision-making rather than replacing professional judgment.

---

## 18. Event-Driven Architecture

### 18.1 Domain Events

The backend implements an internal event system that decouples domain actions from their downstream effects.

**Event Types:**
```
inspection.created
inspection.failed
incident.created
incident.critical
corrective_action.created
corrective_action.overdue
corrective_action.verified
compliance.overdue
document.uploaded
document.verified
user.login
alert.created
alert.escalated
```

**Event Structure:**
```json
{
  "event": "inspection.created",
  "entityId": "inspection-id",
  "siteId": "site-id",
  "actorId": "user-id",
  "timestamp": "2026-09-20T10:30:00Z",
  "payload": { ... }
}
```

### 18.2 Outbox Pattern

Domain events are persisted using the MongoDB Outbox Pattern to ensure reliable asynchronous processing:

```
MongoDB Transaction
    |
    +-- Domain Record (Inspection / Incident / etc.)
    |
    +-- Outbox Event (status: "pending")
```

A background worker polls the outbox for pending events and routes them to appropriate consumers:

```
Outbox Table
    |
    v
Event Processor
    |
    +--> Risk Engine (score calculation)
    +--> Alert Engine (rule evaluation)
    +--> Notification Engine (real-time + email)
    +--> Analytics Engine (metric aggregation)
    +--> Audit Logger (hash-chained entry)
```

**Outbox Event Schema:**
```json
{
  "eventType": "inspection.created",
  "aggregateId": "inspection-id",
  "payload": { ... },
  "status": "pending",
  "attempts": 0,
  "createdAt": "2026-09-20T10:30:00Z"
}
```

### 18.3 Dead Letter Queue

Failed background jobs are not silently dropped. After configurable retry attempts, events move to a dead letter queue:

```
Job Processing Attempt
    |
    v
Failed
    |
    v
Retry 1 -> Retry 2 -> Retry 3
    |
    v
Dead Letter Queue (FailedJob collection)
```

**FailedJob Schema:**
```json
{
  "jobType": "risk_calculation",
  "payload": { ... },
  "error": "Database timeout",
  "attempts": 3,
  "firstFailedAt": "2026-09-20T10:30:00Z",
  "lastFailedAt": "2026-09-20T10:32:00Z",
  "status": "failed"
}
```

An administrative dashboard surfaces pending, failed, and dead letter job counts, last worker run timestamp, and system health status.

---

## 19. SLA Management Engine

### 19.1 SLA Configuration

Service level agreements are configurable per severity level and incident type:

```json
{
  "rule": "CRITICAL_INCIDENT",
  "acknowledgementSla": 30,
  "resolutionSla": 120,
  "escalationLevels": [
    { "level": 1, "role": "mine_official", "delay": 30 },
    { "level": 2, "role": "corporate_manager", "delay": 30 },
    { "level": 3, "role": "senior_authority", "delay": 30 }
  ]
}
```

SLA definitions are stored in MongoDB, allowing administrators to modify escalation rules without code changes.

### 19.2 SLA Lifecycle

```
Incident Created
    |
    v
SLA Rule Matched (by severity + type)
    |
    v
Acknowledgement Timer Starts
    |
    +-- Acknowledged within SLA -> Timer stops
    |
    +-- SLA Breach -> Level 1 Escalation
         |
         +-- Acknowledged -> Timer stops
         |
         +-- SLA Breach -> Level 2 Escalation
              |
              +-- Resolution Timer Starts
              |
              +-- Resolved within SLA -> Closed
              |
              +-- Resolution SLA Breach -> Level 3 Escalation
```

### 19.3 SLA Dashboard

```
SLA PERFORMANCE DASHBOARD

Acknowledgement Rate    94%
Resolution Rate         87%
SLA Breaches            12

Acknowledgement
[||||||||||||||||||--] 94%

Resolution
[||||||||||||||||----] 87%

Recent Breaches:
  CRITICAL_INCIDENT #4821 - Mine Jharia - 3 hours overdue
  HIGH_INCIDENT #4819 - Mine Rajpur - 1 hour overdue
```

---

## 20. Evidence Integrity System

### 20.1 SHA-256 Verification

When documents and images are uploaded, the system computes a SHA-256 checksum of the file content:

```
File Upload
    |
    v
SHA-256 Hash Computation
    |
    v
Evidence Record Created:
{
  "fileUrl": "https://cloudinary.com/...",
  "sha256": "a1b2c3d4...",
  "uploadedBy": "user-id",
  "capturedAt": "2026-09-20T09:15:00Z",
  "uploadedAt": "2026-09-20T10:30:00Z",
  "sourceRecordId": "inspection-id"
}
    |
    v
Verification (on demand):
Current File Hash -> Compare -> Stored Hash -> MATCH / TAMPERED
```

### 20.2 Integrity Dashboard

```
EVIDENCE INTEGRITY

Documents Checked:    1,284
Verified:             1,280
Modified:                 2
Unavailable:              2

Integrity Status:    VALID
Last Full Check:     2026-09-20 08:00
```

### 20.3 Engineering Purpose

This system replaces the need for blockchain-based audit trails while providing equivalent tamper-evidence guarantees for file integrity. SHA-256 hashing is computationally efficient, free to implement, and produces verifiable proof of file authenticity without external service dependencies.

---

## 21. Geospatial Risk Intelligence

### 21.1 Risk Heatmap

The GIS module overlays risk data onto mine location maps:

```
Mine Site Map
    |
    +-- Safety incidents (color-coded by severity)
    +-- Environmental incidents
    +-- Equipment issues
    +-- Repeated violations (clustered markers)
    +-- Corrective action locations

Color Scale:
  Green  -> Low risk area
  Yellow -> Medium risk area
  Orange -> High risk area
  Red    -> Critical risk area
```

Clicking a map region reveals:
- Recent incidents in the area
- Repeated violation patterns
- Open corrective actions
- Inspection history

### 21.2 Geofencing

When field officers submit records, the system validates GPS coordinates against expected mine boundaries:

```
Submitted GPS Coordinates
    |
    v
Point-in-Polygon Check (Turf.js)
    |
    +-- Inside expected zone -> Location Verified
    |
    +-- Outside expected zone -> Location Flagged:
         "Warning: Outside expected inspection zone"
```

This does not automatically reject submissions but adds location verification metadata to the record.

### 21.3 Equipment Lifecycle Tracking

Mine equipment is tracked as a first-class entity:

```
Equipment Registration
    |
    v
Operational Status
    |
    v
Inspection Due -> Inspection Completed
    |
    v
Maintenance Required -> Maintenance Performed
    |
    v
Verification -> Back to Operational
```

Equipment dashboard shows health distribution: total count, healthy, inspection due, under maintenance, critical.

### 21.4 Hazard Register

The system maintains a proactive hazard register beyond reactive incident tracking:

| Hazard | Location | Risk Level | Controls | Status |
|--------|----------|------------|----------|--------|
| Loose strata | Zone A | High | Reinforcement | Open |
| Dust exposure | Zone C | Medium | Dust suppression | Controlled |
| Vehicle interaction | Haul Road | High | Traffic separation | Open |

### 21.5 Control Effectiveness Tracking

For each hazard control, the system measures effectiveness:

```
Hazard: Vehicle-pedestrian interaction
Initial Risk Score: 82
Control: Dedicated pedestrian route
Post-Control Risk Score: 41
Effectiveness: 50% reduction
```

### 21.6 Safety Action Effectiveness

After corrective actions close, the system monitors for recurrence over a 30-day window:

```
Corrective Action Closed
    |
    v
30-day monitoring period
    |
    +-- Same violation repeated -> Control Ineffective
    +-- No recurrence -> Control Effective
```

Effectiveness rates are surfaced in analytics dashboards.

---

## 22. Testing and Reliability

### 22.1 Test Architecture

The testing strategy covers multiple levels:

```
tests/
    unit/           -- Individual function and service testing
    integration/    -- API endpoint testing with database
    e2e/            -- Full workflow scenario testing
    security/       -- Authorization and access control tests
    load/           -- Performance and concurrency testing
```

### 22.2 Test Implementation

| Technology | Application |
|------------|------------|
| Jest | Test runner, assertions, mocking |
| Supertest | HTTP endpoint testing |
| In-memory MongoDB | Isolated database testing without external dependencies |

**Test Coverage Areas:**

- Authentication flows (registration, login, token validation, expiry)
- Authorization and RBAC enforcement (cross-site access prevention)
- Inspection submission and sync with deduplication
- Incident creation with severity-based alert generation
- Corrective action lifecycle transitions
- Alert escalation timing and state guards
- Audit log hash chain integrity verification
- Dashboard metric calculations
- Messaging and notification delivery
- Scheduled summary generation
- File upload validation and rejection

### 22.3 Resilience Patterns

**API Timeouts:** External service calls (Cloudinary, OCR) include configurable timeout values to prevent indefinite blocking.

**Retry Behavior:** Failed external calls implement exponential backoff retry with configurable maximum attempts.

**Fallback Behavior:** When external services are unavailable, the system operates in degraded mode. File uploads queue for retry. OCR processing marks documents as pending. Risk calculations use cached values where available.

**Graceful Degradation:** Scheduled jobs catch and log errors without halting the scheduler. Individual record processing failures do not block batch operations.

---

## 23. Deployment Architecture

### 23.1 Production Architecture

```
React Native / Frontend (Mobile)
        |
        v
     Vercel (Frontend Hosting + CDN)
        |
        | API Requests (HTTPS)
        v
Node.js / Express Backend
        |
        v
     Render (Application Hosting)
        |
        v
     MongoDB Atlas (Database)
        |
        v
     Cloudinary (File Storage)
```

### 23.2 Environment Configuration

```env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=http://localhost:5173
CLOUDINARY_ENABLED=true
```

All secrets are stored in environment variables. No credentials appear in source code.

### 23.3 Health Monitoring

```
GET /health
{
  "status": "ok",
  "timestamp": "2026-09-20T10:30:00Z"
}

GET /ready
{
  "database": "connected",
  "storage": "available",
  "workers": "healthy",
  "uptime": 98231
}
```

### 23.4 Observability

Every request includes a correlation ID (`x-request-id`) that flows through all service layers:

```
Frontend -> x-request-id: req_8291 -> Backend -> Service -> Database -> Audit Log
```

Structured logging captures: timestamp, requestId, userId, route, method, status code, and duration. This enables end-to-end request tracing for debugging and performance analysis.

---

## 24. Engineering Challenges

### 24.1 Offline Data Synchronization

**Challenge:** Field officers operate in areas with intermittent connectivity. Data must never be lost, and duplicate records must be prevented when submissions are retried.

**Technical Approach:** Client UUID generation on device, local queue persistence via AsyncStorage, batch sync endpoint on backend, MongoDB upsert with clientUuid unique index for deduplication.

**Engineering Consideration:** Timestamp handling distinguishes device capture time from server sync time. GPS coordinates are captured at submission, not at sync.

**Result:** Field officers can work fully offline. Data syncs automatically when connectivity restores. No duplicate records are created from retried submissions.

### 24.2 Explainable Risk Scoring

**Challenge:** AI-driven risk assessment must be transparent and auditable, not a black box that produces unexplained scores.

**Technical Approach:** Weighted multi-factor algorithm with explicit scoring dimensions (alert severity, inspection failures, incidents, resolution rate). Each dimension contributes traceable points to the final score.

**Engineering Consideration:** Insufficient data cases are handled by setting a risk floor rather than defaulting to low risk, preventing false safety signals.

**Result:** Every risk score includes a factor breakdown showing exactly which metrics contributed to the assessment. Stakeholders can understand and verify the reasoning.

### 24.3 Configurable Escalation Matrix

**Challenge:** Escalation rules vary by organization and severity. Hardcoding hierarchies makes the system inflexible.

**Technical Approach:** SLA rules and escalation matrices stored in MongoDB with configurable levels, roles, and delays. The workflow engine reads configuration at runtime.

**Engineering Consideration:** Changes to escalation rules take effect without code modification. The system supports different escalation paths for different incident types.

**Result:** Administrators configure escalation behavior through the application, not through code changes.

### 24.4 Hash-Chained Audit Trail

**Challenge:** Audit logs must be tamper-evident. If any historical entry is modified, the system must detect the alteration.

**Technical Approach:** Each audit entry stores the SHA-256 hash of the previous entry (prevHash) and a hash of its own canonical fields (thisHash). The chain starts from a genesis hash of 64 zeros.

**Engineering Consideration:** Any modification to a historical entry breaks its thisHash, which cascades to break every subsequent entry's prevHash. This provides tamper detection without external services.

**Result:** A verifiable, append-only audit trail where any historical modification is detectable by re-verifying the hash chain.

### 24.5 Evidence Integrity Without Blockchain

**Challenge:** File integrity verification is needed for compliance evidence, but blockchain infrastructure adds unnecessary complexity.

**Technical Approach:** SHA-256 checksum computed at upload time and stored alongside the file reference. Verification compares current file hash against stored hash.

**Engineering Consideration:** This provides equivalent tamper-evidence for file integrity without distributed ledger complexity.

**Result:** Evidence files are verifiable as authentic and unmodified, with a simple and auditable verification process.

### 24.6 Event-Driven Processing with Outbox Pattern

**Challenge:** Domain actions must trigger multiple downstream effects (risk calculation, alert generation, notifications, audit logging) reliably without losing events.

**Technical Approach:** MongoDB transaction writes both the domain record and an outbox event atomically. A background worker processes pending outbox events and routes them to consumers. Failed events move to a dead letter queue.

**Engineering Consideration:** The outbox pattern ensures that event emission and domain persistence are atomic. No events are lost between database writes and notification dispatch.

**Result:** Domain events are processed reliably even under failure conditions, with dead letter visibility for operational monitoring.

### 24.7 Mobile Geofencing

**Challenge:** Field submissions should be validated against expected mine boundaries to verify location authenticity.

**Technical Approach:** GPS coordinates from submissions are checked against stored geofence polygons using point-in-polygon algorithms (Turf.js).

**Engineering Consideration:** Validation is advisory, not blocking. Outside-zone submissions are flagged but not rejected, accommodating legitimate edge cases.

**Result:** Location verification metadata enriches submissions without preventing legitimate field activity.

### 24.8 Idempotent Background Processing

**Challenge:** Scheduled cron jobs must safely re-execute without creating duplicate alerts or corrupting state, even if a previous execution was interrupted.

**Technical Approach:** Alert creation uses MongoDB `findOneAndUpdate` with upsert and unique `ruleKey`. State transitions verify expected predecessor state before allowing change.

**Engineering Consideration:** Idempotency means any number of scheduler runs produce the same result as a single run. This is critical for reliability in production environments where cron jobs may overlap or restart.

**Result:** Background processing is safe under all execution conditions, including restarts, overlaps, and partial failures.

### 24.9 Cross-Role Data Access Control

**Challenge:** Different roles must see different subsets of the same data, enforced server-side, not through UI hiding.

**Technical Approach:** Authorization middleware applies role-based filters at the database query level. Mine officers' queries include `siteId` filter. Corporate managers receive unfiltered cross-site queries. Regulators receive only compliance-scoped responses.

**Engineering Consideration:** Server-side enforcement means that direct API calls cannot bypass access restrictions, regardless of client behavior.

**Result:** Data access is provably restricted by role and site assignment at the API level.

### 24.10 OCR Processing Reliability

**Challenge:** OCR accuracy varies with document quality, and extracted fields may be incorrect.

**Technical Approach:** Per-request Tesseract workers prevent concurrency issues. Confidence scores accompany every extraction. Low-confidence results are flagged for manual review rather than auto-accepted.

**Engineering Consideration:** The system never assumes OCR results are correct without human confirmation for low-confidence extractions.

**Result:** Document processing degrades gracefully with quality, maintaining accuracy through human-in-the-loop review.

---

## 25. Professional Engineering Skills Demonstrated

### 25.1 Full-Stack Engineering

Demonstrated through end-to-end feature implementation spanning React frontend, Node.js/Express backend, and MongoDB persistence. The system handles authentication, authorization, data validation, business logic, real-time communication, and background processing across a complete MERN stack.

### 25.2 Mobile Development

Demonstrated through the React Native (Expo) field application implementing offline-first architecture, local data persistence, GPS capture, photo evidence, and conflict resolution for synchronization. The repository pattern enables seamless switching between mock and live API implementations.

### 25.3 Backend Engineering

Demonstrated through a layered Express API with routes, middleware, controllers, services, Mongoose models, Zod validation, scheduled background jobs, Socket.io real-time events, and the outbox pattern for reliable event processing.

### 25.4 Database Engineering

Demonstrated through MongoDB schema design with nine core collections, strategic indexing for performance (unique indexes for deduplication, compound indexes for date-range queries), and aggregation pipelines for risk scoring, anomaly detection, and trend analysis.

### 25.5 API Development

Demonstrated through RESTful API design with versioned endpoints, consistent response formats, pagination, validation schemas, error handling, and idempotent operations for offline sync.

### 25.6 Authentication and Authorization

Demonstrated through JWT-based authentication with bcryptjs password hashing, role-based access control with resource-level scoping, and assignment-based operation restrictions.

### 25.7 Security Engineering

Demonstrated through hash-chained audit trails, evidence integrity verification (SHA-256), security event tracking, input validation, rate limiting, CORS configuration, and secrets management via environment variables.

### 25.8 Automation

Demonstrated through node-cron scheduled tasks for batch rule evaluation, workflow escalation, SLA monitoring, and worker health checks. All operations are idempotent with dead letter queue handling for failures.

### 25.9 AI Integration

Demonstrated through explainable risk scoring with weighted multi-factor analysis, statistical anomaly detection, OCR document processing with structured field extraction, and trend analysis with period-over-period comparison.

### 25.10 Testing

Demonstrated through Jest and Supertest test suites covering authentication, authorization, API endpoints, scheduled jobs, and audit trail integrity verification. In-memory MongoDB provides isolated test environments.

### 25.11 Cloud and Deployment

Demonstrated through deployment architecture using Vercel (frontend), Render (backend), MongoDB Atlas (database), and Cloudinary (storage), with environment-based configuration and health check endpoints.

### 25.12 Product Engineering

Demonstrated through role-based dashboard design, configurable SLA management, GIS risk visualization, offline-first mobile UX, and domain-specific features (hazard register, equipment lifecycle, permit-to-work) aligned with coal mining governance requirements.

---

## 26. Technical Decisions and Trade-offs

### 26.1 REST API Architecture

A RESTful API provides a well-understood, cacheable, and standards-compliant communication layer. For a governance platform with clear resource definitions (inspections, incidents, alerts, compliance items), REST maps naturally to CRUD operations while supporting the pagination, filtering, and role-scoping requirements.

### 26.2 MongoDB Over Relational Database

MongoDB accommodates the diverse record types in a governance system without rigid schema migrations. Inspection checklists vary by type, incident descriptions are unstructured, and compliance requirements differ across jurisdictions. Document-based storage handles this variability while Mongoose provides schema validation at the application layer.

### 26.3 Aggregation Pipelines for Risk Scoring

Using MongoDB aggregation rather than application-level computation keeps risk calculations close to the data. Aggregation pipelines process 30-day windows of alerts, inspections, and incidents in a single database round trip, reducing network overhead and application memory pressure.

### 26.4 Service Layer Separation

The service layer isolates business logic from HTTP transport concerns. This makes services testable without Express, reusable across controllers, and independent of the API framework. Risk scoring, workflow escalation, and audit logging are all invoked through service methods rather than being embedded in controllers.

### 26.5 Outbox Pattern for Event Processing

The outbox pattern ensures that domain persistence and event emission are atomic. A database transaction writes both the domain record and the outbox event, preventing the scenario where a record is saved but downstream notifications fail to fire. This is more reliable than in-memory event emitters for production workloads.

### 26.6 SHA-256 Over Blockchain for Audit Integrity

Hash-chained audit logs provide tamper-evidence equivalent to blockchain for single-organization use cases. The approach requires no external infrastructure, operates at database speed, and produces verifiable integrity proofs through simple hash chain re-verification.

### 26.7 Per-Request OCR Workers

Creating and destroying Tesseract workers per request avoids the "worker busy" errors that occur with shared workers under concurrent load. The trade-off is slightly higher resource usage per request, but reliability and simplicity outweigh the cost for the expected request volume.

### 26.8 Idempotent Scheduled Jobs

Designing all cron operations as idempotent means the scheduler can safely re-execute after failures, restarts, or overlapping runs. The trade-off is slightly more complex upsert logic compared to simple inserts, but the reliability gain justifies the implementation cost.

### 26.9 Advisory Geofencing

Flagging outside-zone submissions rather than rejecting them accommodates legitimate edge cases (inspections near zone boundaries, new operational areas). Strict blocking would create false negatives that frustrate field officers.

---

## 27. Project Maturity Assessment

### 27.1 Implemented Capabilities

- Complete CRUD operations for all core entities (users, sites, inspections, incidents, attendance, alerts, compliance, corrective actions, documents)
- Role-based access control with four roles and resource-level scoping
- Real-time alert delivery via Socket.io
- Scheduled batch processing for overdue detection, anomaly detection, and repeat violation identification
- Workflow escalation engine with configurable state transitions
- Hash-chained audit trail with tamper detection
- AI risk scoring with explainable factor breakdowns
- OCR document processing with structured field extraction
- GIS marker visualization with risk overlay
- Offline-first mobile architecture with sync and deduplication
- Report generation (PDF) for compliance, inspection, violation, and risk data
- Cloud file storage via Cloudinary integration
- API verification through Postman collections and Newman

### 27.2 Production-Oriented Practices

- Input validation via Zod schemas on all endpoints
- Server-side authorization enforcement (not UI-only)
- Idempotent background processing
- Hash-chained audit logs
- Evidence integrity verification
- Security event tracking
- Health check endpoints
- Request correlation IDs for tracing
- Environment-based configuration
- Structured error responses without internal detail exposure

### 27.3 Current Limitations

- No multi-factor authentication implementation
- No refresh token rotation (single JWT with expiry)
- No real-time messaging between users (alerts only)
- No comprehensive structured logging framework
- No CI/CD pipeline automation
- No load testing or performance benchmarking
- Limited test coverage for edge cases
- No cursor-based pagination for large datasets
- Timezone handling not fully implemented for cross-region deployments

### 27.4 Planned Improvements

| Category | Item | Priority |
|----------|------|----------|
| Security | Multi-factor authentication (TOTP) | High |
| Security | Refresh token rotation | High |
| Security | Role-based rate limiting | Medium |
| Quality | CI/CD pipeline with type checking and tests | High |
| Quality | Expanded test coverage for edge cases | Medium |
| Quality | Contract testing for API consumers | Medium |
| Observability | Structured logging framework | Medium |
| Observability | Request-level metrics and tracing | Medium |
| Observability | System health dashboard | Low |
| API | Cursor-based pagination | Medium |
| API | Saved filter views | Low |
| API | Swagger/OpenAPI documentation | Medium |
| Mobile | Offline conflict resolution UI | High |
| Mobile | Background sync dashboard | Medium |
| Mobile | Notification preference configuration | Low |
| Intelligence | Semantic search across records | Medium |
| Intelligence | Natural-language query interface | Low |
| Intelligence | Incident similarity detection | Medium |
| Intelligence | Recurring problem pattern detection | Medium |
| Domain | Hazard register with control effectiveness | Medium |
| Domain | Equipment lifecycle management | Medium |
| Domain | Permit-to-work system | Low |
| Domain | Regulatory knowledge base | Low |
| Domain | Document version control | Low |
| Domain | Data export with audit trail | Medium |

---

## 28. Final Project Summary

AgniStrot is a modular, event-driven governance and safety platform for coal-mine operations. It combines compliance management, field intelligence, hazard management, configurable workflows, geospatial risk visualization, explainable risk analytics, evidence integrity, offline synchronization, role-resource-based authorization, and production-oriented observability into a unified system.

The platform is built on a MERN stack foundation (React, Node.js, Express, MongoDB) with a React Native (Expo) mobile application for field operations. Its architecture follows layered separation of concerns across routes, middleware, controllers, services, and models, with an event-driven domain processing layer using the MongoDB Outbox Pattern.

The most significant technical areas include the explainable risk scoring engine, the hash-chained audit trail, the offline-first mobile synchronization architecture, the configurable SLA and escalation management, and the event-driven processing pipeline with dead letter queue handling.

The system demonstrates professional engineering capabilities across full-stack development, mobile development, backend architecture, database design, API development, authentication and authorization, security engineering, automation, AI integration, testing, cloud deployment, and domain-specific product engineering for coal mining governance.

The current development direction focuses on security hardening (MFA, refresh token rotation), observability (structured logging, metrics, tracing), testing maturity (CI/CD pipeline, expanded coverage), and advanced intelligence features (semantic search, anomaly detection, natural-language queries).

---

*AgniStrot - Centralized Governance, Compliance Monitoring, Field Intelligence, AI-Assisted Decision Making*

