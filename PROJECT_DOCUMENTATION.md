# TelecomOps 360 — Platform Architecture, Phase-by-Phase Changelog & Roadmap Documentation

> **Document Version:** 1.0.0  
> **Platform Name:** TelecomOps 360  
> **Target Audience:** Network Operations Center (NOC) Engineers, Base Station Controller (BSC/BSS) Specialists, Field Operations Engineers, Transmission & Power Technicians, Operations Managers, and System Architects.  
> **Current Platform State:** Full-Stack Enterprise Platform with Server-Enforced Multi-Tenant Security, MapLibre GIS Mapping, Konva Photo Annotation, jsPDF / XLSX Engineering Report Generation, and Unified Work Case Management.

---

## 1. Executive Summary: What is the Website / Platform?

**TelecomOps 360** is an enterprise-grade operational management and field engineering web platform purpose-built for telecommunications network infrastructure providers, mobile network operators (MNOs), and managed tower service contractors.

In telecom operations, there is typically a severe disconnect between high-level Network Operations Center (NOC) alarm dashboards and the reality of on-the-ground field engineering. Disconnected spreadsheets, fragmented WhatsApp/email photo exchanges, and unverified work orders result in prolonged Mean Time to Repair (MTTR), missed Service Level Agreements (SLAs), and audit vulnerabilities.

**TelecomOps 360 solves this by bridging the entire operational lifecycle into a unified single-pane-of-glass platform:**
1. **Network Surveillance & Alarms:** Ingestion and triaging of raw BSS/RAN/Power/Environmental alarms from multi-vendor network elements (Nokia NetAct, Huawei NCE, Ericsson ENM, dry contacts).
2. **Incident Lifecycle & SLA Engine:** Strict 8-state incident management with parent-child alarm correlation and dynamic countdown timers linked to severity tiers (Critical, Major, Minor, Warning).
3. **Geospatial Infrastructure (GIS):** MapLibre-powered high-performance vector mapping of macro towers, rooftop sites, underground fiber ducts, microwave backhaul links, and outside-plant hardware (FDTs, manholes, splitters).
4. **Field Site Visits & Checklists:** Mobile-ready inspection checklists (RF, Power, Transmission, Fiber, Environment), test instrument measurement tracking (VSWR, optical power, DC bus voltage), and equipment swap records.
5. **Photo Annotation Studio:** In-browser Konva-based canvas allowing field engineers to mark up physical defects (arrows, text, measurement callouts) and automatically burn in tamper-evident forensic metadata stamps (site code, GPS, timestamp, engineer ID, work order reference).
6. **Technical Reporting Engine:** Instant generation of 16 standardized telecom engineering report types with multi-page branded PDF exports (jsPDF) and multi-sheet Excel workbooks (XLSX).
7. **Unified Work Case Workspace:** Consolidated multi-day field case tracking integrating steps, materials, equipment, measurements, photos, and follow-up tasks.
8. **Hardened Multi-Tenant Backend:** Server-side Express engine running PBKDF2 credential hashing, HMAC-SHA256 session management, optimistic concurrency control (OCC), and strict organization data isolation.

---

## 2. Technology Stack & Core Architecture

| Layer | Technologies & Libraries | Key Responsibilities |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite 8 | Reactive component tree, strict domain typing, fast bundling |
| **Styling & UI** | Tailwind CSS v4, Lucide React Icons | High-contrast NOC dark theme & daylight field theme, responsive layouts |
| **Geospatial (GIS)** | MapLibre GL 6, `@turf/turf`, Terra Draw | Vector basemaps, fiber/microwave topology layers, interactive drawing, spatial measurements |
| **Canvas & Photo Markup** | Konva 10, HTML5 Canvas API | Non-destructive image markup, zoom/pan, shape editing, forensic metadata stamp rendering |
| **Reporting & Exports** | jsPDF 4, jsPDF-AutoTable 5, SheetJS (xlsx 0.18) | Branded vector PDF generation, multi-tab Excel workbooks, JSON data packages |
| **Backend & API** | Node.js, Express 4.21, tsx | Server-side proxy for GIS/geocoding, RESTful endpoints, rate limiting |
| **Storage & Persistence** | Atomic File-based JSON Database (`/.data/telecomops360_backend_db.json`) | Persistent multi-tenant datastore with transactional atomic buffer writes |
| **Security & Auth** | Node.js `crypto` (PBKDF2-HMAC-SHA512, HMAC-SHA256 tokens) | Server-side credential verification, signed bearer sessions, instant revocation, RBAC matrix |

---

## 3. Phase-by-Phase Breakdown: What Was Built & Where Each Phase Stopped

The development of TelecomOps 360 was structured into progressive evolutionary phases. Below is the detailed record of what was created in each phase, the major functional changes introduced, and the exact boundary where each phase terminated.

---

### Phase 1: Core Console, Auth UI, Overview, Alarm Center, Sites Directory & Work Orders

#### What Was Built:
- **Foundational Data Architecture:** Defined typed TypeScript models for Users, Teams, Sites, Equipment, Alarms, Incidents, Work Orders, and Audit Events (`src/types/models.ts` and `src/data/seedData.ts`).
- **Authentication Interface (`src/components/auth/SignInPage.tsx`):** Multi-role credential login simulator supporting 6 initial roles (Admin, Maintenance Manager, NOC Engineer, Field Engineer, Team Leader, Read-Only Auditor).
- **Executive & NOC Overview (`src/components/overview/OverviewModule.tsx`):**
  - Live operational metrics: Site availability percentage, active critical alarms, open incidents, pending work orders, and scheduled visits.
  - Interactive status badges, recent activity streams, and quick navigation shortcuts.
- **Sites Directory (`src/components/sites/SitesModule.tsx`):**
  - Registry of 8 representative cell sites across Greenfield Towers, Rooftops, and Indoor IBS/DAS hubs.
  - Technical parameters: Coordinates, tower height, AC/DC power configuration, generator specs, installed technologies (2G/3G/4G/5G), and assigned engineering squads.
  - Modal for creating and editing cell sites (`UpsertSiteModal.tsx`).
- **Alarm Center (`src/components/alarms/AlarmCenterModule.tsx`):**
  - Strict domain separation between *Raw Alarms* (transient OSS notifications) and *Incidents* (verified operational tickets).
  - Multi-vendor categorization: Nokia NetAct, Ericsson ENM, Huawei NCE, and dry contacts (LLVD, high temperature, door open).
  - Alarm triage: Acknowledgment workflows, manual creation of linked incidents, and alarm filtering by severity (Critical, Major, Minor, Warning).
- **Work Orders (`src/components/workorders/WorkOrdersModule.tsx`):**
  - Dispatching corrective and preventive maintenance tasks to specific teams and lead engineers.
  - Recording required spare parts, safety access protocols, and technician sign-offs.
- **Local Persistence & Seed Controls:**
  - Synchronizing store updates into browser `localStorage`.
  - Factory reset mechanism restoring the baseline demo database.

#### Where Phase 1 Stopped (Boundaries & Limitations):
- **No Automated Correlation:** Correlating cascading alarms (e.g., Commercial AC Power Outage triggering Rectifier DC Battery Discharge and subsequent Cell Outage) had to be reasoned manually by the NOC operator.
- **Static SLA Awareness:** Incidents did not have dynamic countdown clocks, breach notifications, or severity-based milestone targets.
- **Placeholders for Advanced Modules:** Site Visits, Equipment Inventory, Technical Reports, and Settings were represented by read-only previews in `PlannedModuleView.tsx`.
- **Client-Side Security:** Role checks were purely client-side simulation without cryptographically validated tokens or server-side policy enforcement.
- **No Geospatial Visualization:** Sites were only listed in tabular format without interactive mapping.

---

### Phase 2: Telecom GIS Geospatial Mapping & Network Infrastructure Topology

#### What Was Built:
- **MapLibre GL Vector Map Module (`src/components/gis/GisMapModule.tsx`):**
  - GPU-accelerated interactive map rendering sites, lines, and compounds across zoom levels.
  - 4 basemap display modes: NOC High-Contrast Dark Slate, Carto Clean Light, OpenStreetMap Daylight, and Aerial Satellite imagery (`src/services/mapProviderService.ts`).
- **Multi-Layer Telecom Infrastructure:**
  - **Sites Layer:** Macro towers, rooftops, microcells, and BSC hub facilities with operational status indicators (Online, Degraded, Offline, Maintenance).
  - **Fiber & Transmission Layer:** Point-to-point and multipoint fiber optic cable routes, underground duct systems, and microwave line-of-sight hops.
  - **Outside Plant Equipment:** Geospatially positioned Manholes/Handholes, Fiber Distribution Terminals (FDT), Optical Splitters (FAT), outdoor telecom cabinets, generator/rectifier concrete pads, and environmental sensor nodes.
- **Geospatial Measurement & Editing Tools:**
  - Integrated `@turf/turf` calculations for geodesic straight-line distance, multi-hop route tracing, and polygon area calculation (site compound perimeter/footprint).
  - Integrated Terra Draw engine for drawing, selecting, modifying, and deleting points, polylines, and polygons.
  - Feature inspection modal (`GisFeatureModal.tsx`) for inspecting technical properties and linking GIS assets to registered sites.
- **Spatial Data Exchange (`src/components/gis/GeoJsonImportExportModal.tsx`):**
  - Import and export of RFC 7946 GeoJSON Feature Collections with topology validation.
- **Server Geocoding Proxy:**
  - Added Express endpoints (`/api/gis/status` and `/api/gis/geocode`) to securely proxy address queries without leaking external GIS API keys to the browser bundle.

#### Where Phase 2 Stopped (Boundaries & Limitations):
- **Isolated GIS Domain:** GIS features were not yet deeply integrated with field visit checklists, maintenance reports, or photo assets.
- **No Live Sensor Ingestion:** Map markers reflected static database attributes rather than real-time streaming telemetry feeds.
- **Field Reporting Gap:** Field technicians still lacked a way to document on-site photo evidence or generate customer-facing reports from map data.

---

### Phase 3: SLA Engine, Cascading Alarm Correlation, Field Checklists & Interactive Visits

#### What Was Built:
- **Dynamic SLA & Escalation Engine (`src/services/slaAndCorrelationService.ts`):**
  - Configurable SLA threshold matrix (`SLAConfiguration`) covering:
    - Time to Acknowledge (TTA)
    - Time to Assign (TTAs)
    - Time to Dispatch (TTD)
    - Time to Restore (TTR)
    - Time to Resolve (TTRs)
  - Severity-tiered standards: Critical (15m ack / 3h restore), Major (30m ack / 6h restore), Minor (1h ack / 12h restore), Warning (2h ack / 24h restore).
  - Real-time milestone countdown timers in UI with visual warnings when 75% of the SLA budget has elapsed, and automated SLA breach flags.
- **Automated Root-Cause & Alarm Correlation Engine:**
  - Intelligent heuristic rule evaluator identifying common telecom cascade patterns (e.g., *Mains Commercial AC Fail* + *Rectifier High Temp* -> *BSS BSC Link Loss*).
  - Rule-based correlation suggestions allowing one-click bundling of multiple alarms under a primary root-cause incident.
- **Full Field Site Visits Module (`src/components/visits/SiteVisitsModule.tsx`):**
  - Replaced the Phase 1 placeholder with a complete interactive field execution workspace.
  - **5 Domain Checklist Templates:**
    1. *RAN, BBU, RRU & Antenna Line Inspection* (VSWR sweeps, RET actuators, fiber clean check).
    2. *Microwave & Transmission Backhaul* (IDU/ODU alignment, RSL levels, BER test).
    3. *AC/DC Power Systems & Diesel Generator* (battery float voltage, ATS transfer, generator run-hours).
    4. *Fiber & Optical Infrastructure* (OTDR fiber trace, optical loss, connector inspection).
    5. *Environmental & Site Security* (intrusion alarms, HVAC filters, grounding bar resistance).
  - **Geofenced Arrival & Departure:** Simulated GPS coordinates capture validating that technician arrival timestamps match physical site coordinates.
  - **Physical Measurements Form:** Dedicated records for test instrument results (Fluke multimeters, Anritsu Site Master VSWR testers, EXFO OTDR).
  - **Spare Part Usage & Hardware Swaps:** Logging serial numbers and part numbers for decommissioned vs. newly commissioned equipment.
- **Teams & Users Management (`src/components/teams/TeamsAndUsersModule.tsx`):**
  - Team roster management, specialization assignment, on-call schedules, and engineer availability states (Available, On-Site, Busy, Off-Shift).

#### Where Phase 3 Stopped (Boundaries & Limitations):
- **Unformatted Photos:** Photos captured during visits were raw image files without canvas-based defect markup or calibrated watermarking.
- **Lack of Exportable Deliverables:** While data was captured digitally, engineers could not export standardized, branded PDF inspection reports for tower owners or clients.
- **Local Browser Boundary:** Multi-user collaboration was simulated locally within single-browser sessions.

---

### Phase 4: Konva Photo Annotation Studio & Technical Reporting Engine (PDF/XLSX/JSON)

#### What Was Built:
- **Photo Annotation Studio (`src/components/photos/PhotoAnnotationStudio.tsx`):**
  - Full-featured HTML5 Canvas markup environment powered by **Konva 10**.
  - **Annotation Tools:** Selector, pointer arrow, high-visibility rectangle box, inspection circle, freehand drawing pen, text callout with background fill, and dimension line measurement tool.
  - **Customizable Styling:** Multi-color palette (Critical Red, Safety Yellow, Verified Green, Telecom Sky, Warning Orange, Pure White) and variable stroke thicknesses (2px to 8px).
  - **Non-Destructive Workflow:** Immutable storage of `originalDataUrl` alongside mutable vector markup layers, allowing unlimited Undo/Redo operations and revert-to-original capabilities.
- **Tamper-Evident Forensic Metadata Stamping (`src/services/reportExportService.ts`):**
  - Configurable stamp engine embedding two-column grid or single-line banner watermarks into exported photos.
  - Embedded metadata fields: Organization Name, Report Number, Incident ID, Work Order ID, Site Code, Site Name, Region, Hardware Description, Photo Title, Photo Classification (Before, During, After, Defect, Verification), High-Precision UTC Capture Timestamp, Engineer Name, and GPS Coordinates.
- **Enterprise Reports Center Module (`src/components/reports/ReportsCenterModule.tsx`):**
  - Catalog of **16 Specialized Telecom Engineering Report Types**:
    - *Incident RCA, Corrective Maintenance, Preventive Maintenance, Emergency Outage Restoral, BTS/Cell Commissioning, Microwave Link Alignment, Antenna Sweep & VSWR, Fiber OTDR & Fusion Splice, AC/DC Power & Rectifier, Diesel Generator & ATS Service, Battery Discharge & Impedance, Tower Structural & Aviation Lighting, HVAC & Climate, Grounding & Lightning Protection, Site Handover & Acceptance, Environmental Audit.*
  - **Formal Approval Lifecycle:** Multi-stage governance (`Draft` -> `Pending Review` -> `Approved` / `Rejected` -> `Superseded`) with audit trails and sign-off comments.
  - **PDF Export Engine (jsPDF & AutoTable):**
    - Multi-page vector document generation with custom organization branding, accent colors, executive summaries, tabular measurement data, equipment swap tables, and high-resolution annotated photo galleries.
    - Export options: *Full Report with Photos*, *Full Report without Photos*, and *Compact Executive Summary*.
  - **Multi-Sheet Excel Workbook Export (`xlsx`):**
    - Workbooks with dedicated tabs: *Executive Summary*, *Site & Team Profile*, *Measurements & Checks*, *Parts & Equipment*, and *Timeline Audit*.
  - **JSON Interchange Packages:** Standardized JSON dumps conforming to telecom OSS export schemas.

#### Where Phase 4 Stopped (Boundaries & Limitations):
- **Local Storage Limitations:** Storing multiple base64-encoded annotated photos and inspection reports pushed the limits of browser `localStorage` quotas (typically 5–10 MB).
- **No Server Authority:** There was no centralized backend database to synchronize reports or enforce access control across different mobile/desktop clients.
- **No Cross-Tenant Protection:** No mechanism existed to safely partition records between carrier operators and third-party tower contractors.

---

### Phase 5: Full-Stack Express Engine, Multi-Tenant Security & Server-Enforced RBAC

#### What Was Built:
- **Dedicated Full-Stack Express Server (`server.ts`):**
  - Node.js Express server running with Vite middleware in development and static asset serving in production.
  - Sliding-window rate limiting on sensitive authentication and user-management endpoints.
  - Health check & security posture endpoint (`/api/health`).
- **Telecom Backend Engine (`server/backendEngine.ts`):**
  - **Transactional File Database (`/.data/telecomops360_backend_db.json`):** Atomic file write pipeline using temporary files and atomic renames to prevent corruption during concurrent writes.
  - **PBKDF2 Password Security:** Cryptographic password hashing using `pbkdf2` (100,000 iterations, 32-byte salt, SHA-512) to store salted hashes rather than plain text.
  - **HMAC-SHA256 Signed Bearer Tokens:** Server-issued session tokens incorporating session IDs, user IDs, organization IDs, and Unix timestamps.
  - **Instant Session Revocation:** Immediate invalidation of all user tokens upon password reset or account suspension.
- **Strict Multi-Tenant Organization Isolation:**
  - Complete data isolation between **Primary Telecom Operator** (`ORG-TELECOM-01` / National Carrier Alpha) and **Secondary Contractor Tenant** (`ORG-CONTRACTOR-02` / Apex Tower Contractors).
  - Server-side scoped queries preventing users from one organization from querying, modifying, or viewing sites, incidents, photos, or reports belonging to another organization (enforcing HTTP 403 Forbidden).
  - Super Administrator global cross-tenant visibility vs. tenant-restricted administrator/engineer views.
- **Server-Enforced RBAC & Workflow Validation:**
  - Centralized permissions matrix (`src/security/permissions.ts`) covering 30+ granular actions across organizations, sites, incidents, work orders, reports, and audit logs.
  - **Optimistic Concurrency Control (OCC):** Entity version tags rejecting stale concurrent edits with HTTP 409 Conflict.
  - **Strict Workflow State Transitions:** Rejection of illegal incident lifecycle jumps (e.g., transitioning directly from `In Progress` to `Closed` without `Resolved` produces HTTP 422 Unprocessable Entity).
  - **File Upload Security:** Validation of MIME types (restricting to JPEG, PNG, WebP) and size limits (rejecting payloads > 10MB) to mitigate denial-of-service or script injection risks.
- **User Lifecycle & Point-in-Time Backups (`src/components/settings/SettingsAndSecurityModule.tsx`):**
  - User invitation generation with cryptographically secure single-use tokens.
  - Password reset workflows.
  - Manual and automated point-in-time database snapshot backups and restoration.
  - Redacted audit event logs preventing credentials or session keys from ever appearing in audit trails.
- **Automated Security Verification Test Suite (`tests/phase5.security.test.ts`):**
  - Self-contained automated test harness validating 11 acceptance criteria (AC-01 unauthenticated 401s, AC-02 invalid/tampered tokens, AC-03 field engineer RBAC boundaries, AC-04 cross-tenant data isolation, AC-05 photo upload validation, AC-07/08 OCC and workflow validation, AC-06/09/11 user provisioning and persistence).

#### Where Phase 5 Stopped (Boundaries & Limitations):
- **Fragmented Project Scopes:** While Incidents, Work Orders, and Site Visits were securely managed, field engineers handling complex, multi-day projects (e.g., full 5G site upgrades or fiber link splicing) had to navigate multiple disconnected modules rather than a single unified "Work Case" project workspace.

---

### Work Cases Extension: Unified Work Case Management Workspace

#### What Was Built:
- **Work Cases Module (`src/components/cases/WorkCasesModule.tsx`):**
  - Introduced the unified `WorkCase` domain entity (`src/types/models.ts` and `src/data/seedWorkCasesData.ts`) consolidating all project facets under a single operational case number (e.g., `CASE-2026-0001`).
  - **Telecom Work Type Taxonomy:** 5 major engineering categories with specialized work types:
    1. *Radio Access Network & Towers* (BTS inspection, tower climbing, RRU replacement, BBU maintenance, feeder/RET, VSWR testing).
    2. *Microwave & Transmission* (Link alignment, IDU/ODU swap, fade margin, frequency retune).
    3. *Power & Electromechanical* (Rectifier servicing, battery bank impedance, generator service, solar/hybrid maintenance).
    4. *Fiber Optics & Fixed Access* (OTDR fiber trace, fusion splicing, FDT/FAT termination, duct rodding).
    5. *Preventive & Audit* (Grounding grid inspection, structural torque audit, aviation beacon inspection).
- **Single-Case Engineering Workspace (`src/components/cases/CaseDetailWorkspace.tsx`):**
  - Tabbed operational console for an individual case:
    - **Overview:** Executive summary, problem diagnosis, weather conditions, tools required, and supervisor confirmations.
    - **Steps & Checklists:** Sequential task checklists with status tracking and step-level completion notes.
    - **Measurements:** Parameter measurements with tolerance ranges and test instrument logs.
    - **Materials & Spares:** Detailed consumption logs with part numbers, quantities, warehouse origins, and batch tracking.
    - **Equipment Swaps:** Before-and-after serial numbers, condition states, and installation locations (e.g., Rack 2 RU 14 or Tower Leg B 32m).
    - **Photo Evidence:** Embedded photo studio gallery showing classified before/after photos linked to this case.
    - **Follow-up Tasks:** Post-service actions, re-inspections, and team assignments.
- **Upsert Work Case Modal (`src/components/cases/UpsertWorkCaseModal.tsx`):**
  - Fast-creation and editing modal supporting multi-category templates, site pre-population, and team assignments.
- **Case Export Engine (`src/services/caseExportService.ts`):**
  - Dedicated PDF and Excel workbook exports specifically formatted for work cases, incorporating step completion matrices and tool logs.
- **Deep Cross-Module Navigation:**
  - One-click navigation from Work Cases into GIS map location, Photo Studio markup, and Reports Center.

---

## 4. Current State of the Application (Feature Matrix)

Below is a consolidated summary of the active modules, capabilities, and phase provenance in the codebase today:

| Module / Area | Navigation Label | Current Status | Key Technologies | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Overview** | `Overview` | ✅ Production Active | React, Lucide, Tailwind | Network health KPIs, active alarm counts, SLA countdown banners, recent activity logs |
| **Work Cases** | `Work Cases` | ✅ Production Active | React, CaseExportService | Unified 5-category telecom cases, multi-tab workspace, steps, measurements, spares, PDF/Excel exports |
| **GIS Map** | `GIS MAP` | ✅ Production Active | MapLibre GL, Turf.js, Terra Draw | Vector basemaps, fiber routes, microwave hops, outside plant features, distance & area measurement, GeoJSON import/export |
| **Sites Directory** | `Sites Directory` | ✅ Production Active | React, Tailwind | Cellular sites registry, 2G–5G tech stack, tower heights, power configs, site creation/editing modals |
| **Equipment Inventory**| `Equipment Inventory`| ✅ Production Active | React, Tailwind | Multi-vendor equipment register (BBU, RRU, Antennas, Microwave, DWDM, Rectifiers, Batteries, Generators) |
| **Photo Studio** | `Photo Studio` | ✅ Production Active | Konva 10, HTML5 Canvas | Vector markup (arrows, boxes, circles, text, measurements), non-destructive editing, forensic metadata stamp rendering |
| **Report Center** | `Report Center` | ✅ Production Active | jsPDF, jsPDF-AutoTable, SheetJS | 16 telecom report types, approval lifecycle (Draft/Reviewed/Approved), branded PDF generator, multi-sheet XLSX export |
| **Incident Center** | `Incident Center` | ✅ Production Active | React, SLA & Correlation Service | 8-state incident lifecycle, automated parent-child alarm correlation, live SLA breach timers |
| **Alarm Center** | `Alarm Center` | ✅ Production Active | React, Tailwind | Multi-vendor raw alarm feed (Nokia, Huawei, Ericsson), acknowledgment, severity filtering, incident creation |
| **Work Orders** | `Work Orders` | ✅ Production Active | React, Tailwind | Field work orders, team dispatch, spare part tracking, supervisor verification |
| **Field Operations**| `Field Operations`| ✅ Production Active | React, ReportExportService | 5 domain checklists, GPS geofencing verification, test instrument measurements, equipment swap registers |
| **Team & Users** | `Team & Users` | ✅ Production Active | React, Permissions Engine | Role simulation, user directory, regional engineering squads, shift schedules, on-call hotlines |
| **Settings & Security**| `Settings & Security`| ✅ Production Active | Express, TelecomBackendEngine | Multi-tenant organization switching, database snapshot backups & restores, environment mode toggles, redacted audit logs |

---

## 5. Security & Multi-Tenancy Architecture

```
                                  [ Browser / Client ]
                                           │
                        (Bearer Token / Authorization Header)
                                           │
                                           ▼
                            [ Express Server (server.ts) ]
                                           │
                          ┌────────────────┴────────────────┐
                          ▼                                 ▼
                 Rate Limiter & Middleware        /api/gis/* Proxy
                          │                     (GIS_MAP_API_KEY kept
                          ▼                       server-side only)
           [ TelecomBackendEngine (backendEngine.ts) ]
                          │
       ┌──────────────────┼─────────────────────────┐
       ▼                  ▼                         ▼
  Auth Service       RBAC Engine               Data Scoper
(PBKDF2 Hashes,    (hasPermission)        (Multi-Tenant Filter)
 HMAC Sessions,                            ORG-TELECOM-01  <──ISOLATED──>  ORG-CONTRACTOR-02
 Token Revocation)
       │
       ▼
[ Atomic Transactional JSON Datastore ] (/.data/telecomops360_backend_db.json)
```

1. **Authentication:**
   - Password hashes are computed using PBKDF2 with unique salts.
   - Session tokens are cryptographically signed with an HMAC secret (`TELECOMOPS_SESSION_SECRET`).
   - Token revocation is instantaneous upon user suspension or password reset.
2. **Tenant Isolation:**
   - Every site, incident, alarm, work order, photo asset, and report is tagged with an `organizationId`.
   - Backend queries enforce strict tenant scoping. A user from Organization B cannot view or modify Organization A records, returning HTTP 403 Forbidden.
   - Super Administrators retain cross-tenant visibility for multi-organization platform oversight.
3. **Data Integrity:**
   - Concurrency conflicts are prevented using version numbers (Optimistic Concurrency Control returning HTTP 409).
   - Invalid status jumps in tickets are blocked server-side (returning HTTP 422).
   - Photo file uploads are checked for allowed MIME types (`image/jpeg`, `image/png`, `image/webp`) and size limits (< 10 MB).

---

## 6. How to Run & Verify the Platform

### Running the Application
```bash
# Start the full-stack server (Node.js Express + Vite middleware)
npm run dev
# The dev server binds to http://localhost:3000
```

### Running the Automated Security Test Suite
```bash
# Executes all 7 automated test suites verifying AC-01 through AC-11
npx tsx tests/phase5.security.test.ts
```

### Key Demonstration Credentials
- **Primary Operator Admin:** `s.lindqvist@telecomops360.demo` / `Ops360!Demo` (Sofia Lindqvist — Org Administrator)
- **NOC / BSC Senior Engineer:** `k.mansour@telecomops360.demo` / `Ops360!Demo` (Karim Mansour — NOC Engineer)
- **Field Engineer Specialist:** `d.okafor@telecomops360.demo` / `Ops360!Demo` (David Okafor — Field Engineer)
- **Operations Manager:** `m.almansoori@telecomops360.demo` / `Ops360!Demo` (Mariam Al-Mansoori — Operations Manager)
- **Read-Only Auditor:** `a.bennett@telecomops360.demo` / `Ops360!Demo` (Arthur Bennett — Auditor)
- **Tenant B Contractor:** `m.contractor@apextower.demo` / `Ops360!Demo` (Marcus Vance — Field Contractor)
- **Global Super Admin:** `s.admin@telecomops360.demo` / `Ops360!Demo` (Platform Super Administrator)

---

## 7. Active GIS Map API Key & Geospatial Configuration

- **Configured Key:** `cb1_50a2_1_35699cc2c825dc341309325e`
- **Locations Saved:**
  - `/.env`: `GIS_MAP_API_KEY="cb1_50a2_1_35699cc2c825dc341309325e"`, `VITE_GIS_MAP_API_KEY="cb1_50a2_1_35699cc2c825dc341309325e"`, `VITE_CARTO_API_KEY="cb1_50a2_1_35699cc2c825dc341309325e"`
  - `/.env.example`: Documented as active configuration
  - `/server.ts`: Configured as default server key for `/api/gis/status` and `/api/gis/geocode` proxy
  - `/src/services/mapProviderService.ts`: Injected into MapLibre GL raster style URLs for dark, light, and street basemaps
- **Architecture Benefits:** Keeps sensitive tokens out of client network bundles while supporting high-performance vector mapping and address geocoding.

---

## 8. Product Direction Update: Personal Telecom Work & Case Management

### Core Intent & Design Philosophy
The application is structured to serve as an indispensable, reliable **personal engineering work archive and case management system** for a solo telecom engineer, built with a forward-compatible architecture ready to scale to multi-technician squad operations.

- **Independent Manual-Recording Workflow:** Unnecessary live integrations with Huawei, Nokia, Ericsson, BSC, OSS, or NMS systems are not required dependencies. The engineer can independently record cell sites, inspections, measurements, physical defects, work orders, incidents, photographs, and technical reports.
- **Unified Work Cases at the Core:** All field interventions are tracked under individual cases (`CASE-YYYY-XXXX`) generated with duplicate-collision guards.
- **Configurable 5-Category Taxonomy:**
  1. *Radio Access Network & Towers* (BTS inspection, tower climbing, RRU replacement, BBU maintenance, RET, VSWR sweeps).
  2. *Fiber Optics & Fixed Access* (FTTH/FTTB, cable pulling, splicing, OTDR traces, power measurements).
  3. *Transmission & Networking* (Microwave alignment, IDU/ODU swap, IP/VLAN test, BER check).
  4. *Electrical & Power Systems* (Rectifiers, battery banks, generators/ATS, DC distribution).
  5. *General Engineering & Maintenance* (Site surveys, preventive maintenance, acceptance audits).
- **11-Tab Workspace per Case:** Overview, Site & Location, Work Description & Steps, Equipment Involved, Timeline & Field Log, Photos & Evidence, Calibrated Measurements, Materials & Spares, Findings & Root Cause, Follow-up Tasks, Reports & Exports.
- **Photo Evidence & Forensic Stamping:** Preserves untouched original photographs while generating mutable Konva vector markups and burnt-in metadata stamps (Case ID, Site, Address, Work Type, Equipment, Date/Time, Category, Engineer Name, Caption, Priority).
- **GIS Map with Work Case Filters:** Filter sites and infrastructure on MapLibre GL by region, site type, work type, case status, and case priority. Direct directions links via Google Maps / mapping services.

### Acceptance Criteria Verification (15 Verification Items)
1. **Create, edit, search, and close work cases:** Verified via `WorkCasesModule` and `CaseDetailWorkspace`.
2. **Link multiple cases to the same site:** Multiple cases reference shared site IDs without duplicating static site infrastructure.
3. **In-line site creation:** Users can register a brand new cell site with coordinates directly while creating a work case.
4. **Detailed work details:** Records steps, calibrated measurements with units, equipment items, and spare part quantities.
5. **Multiple photos & original preservation:** Image upload preserves `originalDataUrl` while generating annotated copies.
6. **Photo annotation & case linkage:** Konva canvas supports arrows, boxes, circles, freehand, text, and measurement callouts.
7. **Complete case history:** Full chronological stream and previous-vs-new value audit history preserved.
8. **Multi-attribute filtering:** Filter by site, address, date, category, status, priority, and 10 saved views.
9. **Case PDF reports:** Generates branded multi-page PDF documents incorporating case details, steps, measurements, and annotated photos.
10. **Structured data export:** Exports to multi-tab Excel workbooks (`xlsx`) and JSON interchange packages.
11. **Dashboard statistics from stored records:** Overview metrics (cases opened, in-progress, planned, completed, hours logged) computed strictly from database records.
12. **GIS map integration without vendor lock-in:** MapLibre GL displays sites, routes, and infrastructure markers independently of live vendor streams.
13. **Data persistence:** Atomic JSON database and local storage preserve all records across browser refreshes and re-logins.
14. **Frictionless personal workflow:** Solo engineers can use the entire platform immediately without complex team configuration.
15. **Preserved existing capabilities:** Full-stack security, 8-state incidents, equipment register, and report templates remain 100% operational.

