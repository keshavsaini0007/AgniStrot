# Research & References

## 1. Purpose

This document records the research sources used to shape the project's problem understanding, compliance context, safety assumptions and technology decisions.

The project is an SIH prototype. It must **not** be presented as an official regulatory compliance system unless the applicable laws, rules, organizational processes, data integrations and security requirements have been formally validated.

---

## 2. Primary Official Sources

### Ministry of Coal — Annual Reports

The Ministry of Coal publishes annual reports containing information about the coal sector, including safety, sustainability, production, public-sector undertakings and information technology.

**Reference:** Ministry of Coal, Government of India  
https://coal.gov.in/public-information/reports/annual-reports

The 2025-26 annual report includes a dedicated section on safety in coal mines and information technology.

---

### National Coal Mines Safety Report Portal

The Ministry of Coal's 2024-25 annual report describes the **National Coal Mines Safety Report Portal**, launched on 17 December 2024, including accident reporting and safety-audit related functionality.

**Reference:** Ministry of Coal, Annual Report 2024-25 — Safety in Coal Mines  
https://coal.gov.in/sites/default/files/2025-02/chap14AnnualReport2025en2.pdf

This is important research context because it demonstrates that digital safety monitoring is already a relevant direction in the coal sector.

**Project implication:** our platform should complement rather than falsely claim to replace existing official systems.

---

### Directorate General of Mines Safety (DGMS)

DGMS provides the official mines-safety statutory framework and publishes relevant legislation and regulations.

Important sources include:

- Mines Act, 1952
- Coal Mines Regulations, 2017
- Mines Rules, 1955
- Mine Rescue Rules, 1985
- Occupational Safety, Health and Working Conditions Code, 2020
- Other allied safety legislation

**Reference:** DGMS — Mines Safety & Allied Legislation  
https://www.dgms.gov.in/UserView/index?mid=1654

---

### DGMS — Role and Functions

DGMS describes its role in occupational safety, health and welfare in mines and related activities including inspection and investigation.

**Reference:** DGMS, "DGMS at a Glance"  
https://www.dgms.gov.in/writereaddata/UploadFile/DGMS_GLANCE_07012026.pdf

**Project implication:** inspection, compliance, observations and corrective-action workflows should be treated as governance-support capabilities, not replacements for statutory authorities or professional judgment.

---

## 3. Technology References

### OpenStreetMap / Nominatim

For prototype GIS functionality, Leaflet can render map interfaces using an appropriate tile provider.

If the public Nominatim service is used for geocoding, its usage policy must be followed, including request-rate and attribution requirements.

**Reference:** OpenStreetMap Foundation — Nominatim Usage Policy  
https://operations.osmfoundation.org/policies/nominatim/

**Project implication:** production deployment should not assume that a public community service is an unlimited enterprise backend. A suitable production geocoding/tile architecture should be selected according to scale and provider terms.

---

## 4. Research Findings

### Finding 1 — Safety digitization is already relevant

The Ministry of Coal's annual report describes a National Coal Mines Safety Report Portal.

**Design consequence:** the proposed system should position itself as a broader governance/compliance coordination layer and prototype, not as a claim that all existing government systems are absent.

### Finding 2 — Regulatory context is extensive

DGMS publishes multiple mine-safety statutes and regulations.

**Design consequence:** compliance requirements should be modeled as configurable/versioned records instead of being permanently hard-coded into application logic.

### Finding 3 — Different stakeholders have different responsibilities

Mine operations, inspectors, corporate teams, contractors and regulatory/oversight stakeholders do not need identical permissions.

**Design consequence:** RBAC and scoped access are core architecture requirements.

### Finding 4 — Field operations need location and time context

Many governance observations become more useful when connected to a mine, area, coordinates and timestamp.

**Design consequence:** field reports should support geo-tagging and timestamped evidence.

### Finding 5 — AI requires trustworthy historical data

Predictive ML is only useful when sufficient historical and labeled data exists.

**Design consequence:** the MVP should begin with explainable rules and analytics before claiming sophisticated predictive AI.

---

## 5. Research-to-Feature Mapping

| Research Observation | Product Feature |
|---|---|
| Multiple safety requirements | Compliance module |
| Inspection role of authorities | Inspection workflow |
| Need for safety reporting | Incident/observation records |
| Need to track recommendations/actions | Corrective actions |
| Multiple stakeholders | RBAC |
| Field activities | Mobile reporting |
| Location context | GIS |
| Historical information | Analytics |
| Recurring problems | Risk/recurrence engine |
| Reporting requirements | Report generation |
| Need for traceability | Audit log |

---

## 6. Research Limitations

This project does not claim that this document contains a complete legal interpretation of every law, rule, regulation, circular, notification or mine-specific requirement.

Before production use, the implementation would require:

1. Formal requirements gathering with the concerned organization.
2. Validation of applicable laws and regulations.
3. Validation of current statutory forms and workflows.
4. Data-classification and cybersecurity review.
5. Integration assessment for existing government/enterprise systems.
6. Accessibility and multilingual requirements.
7. Infrastructure and availability requirements.
8. Legal and compliance review.

---

## 7. Reference Links

- Ministry of Coal — Annual Reports  
  https://coal.gov.in/public-information/reports/annual-reports

- Ministry of Coal — Annual Report 2025-26  
  https://coal.gov.in/public-information/reports/annual-reports/annual-report-2025-26

- Ministry of Coal — Annual Report 2024-25  
  https://coal.gov.in/index.php/public-information/reports/annual-reports/annual-report-2024-25

- National Coal Mines Safety Report Portal context — Annual Report 2024-25  
  https://coal.gov.in/sites/default/files/2025-02/chap14AnnualReport2025en2.pdf

- DGMS — Mines Safety & Allied Legislation  
  https://www.dgms.gov.in/UserView/index?mid=1654

- DGMS — Official Website  
  https://www.dgms.gov.in/

- DGMS — DGMS at a Glance  
  https://www.dgms.gov.in/writereaddata/UploadFile/DGMS_GLANCE_07012026.pdf

- OpenStreetMap Foundation — Nominatim Usage Policy  
  https://operations.osmfoundation.org/policies/nominatim/

---

## 8. Research Principle

> **Use authoritative sources for regulatory facts, use engineering evidence for technical decisions, and clearly label prototype assumptions.**
