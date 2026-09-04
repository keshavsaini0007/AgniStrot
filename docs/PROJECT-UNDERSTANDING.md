# Project Understanding — Smart Governance Platform for Coal Mining Operations

*Purpose of this document: a shared understanding of the problem statement before implementation starts — what we're building, what "done" looks like, and what skills/stack the team needs. Not the architecture itself (that comes next, scoped against this).*

---

## 1. The Problem, in Plain Terms

Coal mining companies in India run many mine sites, under multiple subsidiaries, with contractors and regulators involved at every step. Right now, the day-to-day governance work — checking if a site is following safety/environment/labour rules, logging inspections, tracking incidents, managing contractors, filing reports to regulators — happens on paper and in scattered spreadsheets across sites.

**This causes five concrete problems**:
1. Data is inconsistent — the same information exists in different forms in different places.
2. Decisions are slow — by the time head office sees a problem, it's old news.
3. There's no real transparency — regulators and corporate management can't see what's actually happening at a site in real time.
4. Compliance gaps go unnoticed — nobody is systematically catching repeat violations or high-risk patterns.
5. Field-level monitoring is weak — what inspectors actually do on the ground isn't reliably captured or verified.

**The ask**: build one digital platform that replaces this fragmented, paper-based process with a connected system — so compliance, inspections, contractor management, and reporting all live in one place, visible in real time, to the right people.

---

## 2. What the Platform Must Do (Core Requirements)


| # | Requirement | What it means in practice |
|---|---|---|
| 1 | Digital compliance tracking | Every statutory requirement (safety, environment, production, labour) has a digital record — not a filing cabinet |
| 2 | Real-time inspection monitoring | Inspections, observations, violations, and corrective actions are logged and visible as they happen, not weeks later |
| 3 | AI/analytics for risk detection | The system itself flags high-risk sites, repeat violations, and unusual patterns — it doesn't wait for a human to notice |
| 4 | Geo-tagged mobile field reporting | Field officers use a phone app, not paper forms; every entry is timestamped and location-tagged |
| 5 | Multi-role dashboards | Mine officials, corporate management, and regulators each see a view relevant to them, from the same underlying data |
| 6 | Automated alerts & escalation | Overdue actions, critical violations, and deadlines trigger notifications automatically — no manual chasing |
| 7 | Reduced paperwork | The platform *is* the record — not a summary of a paper record kept elsewhere |
| 8 | Scalable across mines/subsidiaries | Designed to be rolled out to more sites without rearchitecting |



## 3. The Five System Components (as specified)

1. **Centralized Dashboard** — real-time compliance/operational view, role-based (mine official / corporate / regulator).
2. **AI/Analytics Engine** — detects compliance risks, anomalies, recurring violations; generates predictive alerts.
3. **Geo-Tagged Mobile App** — field inspections, safety observations, attendance, incident reporting, works offline.
4. **Automated Workflow System** — alerts, reminders, escalations, digital approvals, auto-generated statutory reports.
5. **Digital Infrastructure Layer** — GIS mapping, OCR document digitization, secure/immutable audit trails.

These five map directly to five backend/frontend problem domains we'll need to build, in roughly this priority order for a working demo: **mobile capture → dashboard visibility → alert/analytics logic → workflow automation → GIS/OCR polish.**



---

## 5. Recommended Tech Stack



| Layer | Choice | Why |
|---|---|---|
| Frontend (Dashboard) | **React** (or Next.js if SSR/routing complexity is worth it) | Existing skill; fast to build role-based views |
| Mobile App | **React Native** (or a mobile-responsive React web app if native felt too heavy for the timeline) | Shares logic/components with the web frontend; supports offline storage |
| Backend | **Node.js + Express** | Existing MERN skill; fast to stand up REST APIs |
| Database | **MongoDB** (matches MERN) — alternatively **PostgreSQL** if the team wants stronger relational guarantees for audit/compliance data | MongoDB is faster to iterate with for a hackathon; Postgres is the more "correct" choice long-term for audit trails and relational compliance data. Worth a quick team decision early, since this is expensive to change later. |
| Offline storage (mobile) | **SQLite** or **AsyncStorage/WatermelonDB** (React Native) | Needed for offline-first field data capture |
| File/photo storage | **Local disk / self-hosted, or a free-tier cloud bucket** (e.g., Cloudinary free tier) | For inspection/incident photos |
| Real-time updates | **Socket.io** | Team already has research-assistant-project experience with this; reusable for live dashboard alerts |
| AI/analytics engine | **Rule-based logic in Node.js** (thresholds, pattern checks) — optionally a lightweight ML/statistical layer if time allows (e.g., simple anomaly scoring with a library like `simple-statistics`) | "AI-enabled" doesn't require a trained ML model for an MVP — rule-based detection is legitimate and demoable; frame it honestly in the pitch |
| OCR | **Tesseract.js** (JS-native, no external API dependency) | Fits Node/React stack, no separate service language needed |
| GIS mapping | **Leaflet.js** or **Mapbox GL JS** (free tier) with **OpenStreetMap** | Free, well-documented, React-friendly |
| Audit trail | **Append-only MongoDB/Postgres collection with hash-chaining** (not literal blockchain) | Gets the "tamper-evident" property the problem statement hints at ("blockchain-based audit trails") without the overhead of standing up a real blockchain — reasonable and defensible scoping decision for a hackathon |
| Auth | **JWT-based auth**, role field on user (mine_official / corporate / regulator / field_officer) | Simple, standard, matches Express ecosystem |
| Deployment (for demo) | **Vercel/Render/Railway** (frontend+backend), MongoDB Atlas free tier | Fast to deploy for a hackathon demo without infra overhead |

---

## 6. Skills Needed by Component

| Component | Skills required |
|---|---|
| Dashboard (web) | React/Next.js, role-based UI rendering, chart/data visualization (e.g., Recharts), REST API consumption |
| Mobile app | React Native, offline data storage (SQLite/WatermelonDB), geolocation APIs, camera/photo capture, background sync logic |
| Backend/API | Node.js, Express, REST API design, JWT auth, database schema design |
| AI/Analytics engine | Rule-engine design (conditional logic), basic statistics for anomaly detection, understanding of what "compliance risk" rules mean in this domain |
| Workflow automation | Cron/scheduled jobs (`node-cron`), state-machine thinking (alert → assigned → escalated → resolved), notification integration (email/SMS APIs) |
| GIS | Leaflet.js/Mapbox integration, working with lat/long data, map overlays |
| OCR | Tesseract.js integration, basic text-parsing/regex to structure extracted text |
| Audit trail | Hashing (Node `crypto` module), append-only data design |
| Database design | Schema/data modeling (relational or document), indexing for query performance |
| DevOps (minimal) | Environment config, basic deployment (Vercel/Render), version control (Git) |


