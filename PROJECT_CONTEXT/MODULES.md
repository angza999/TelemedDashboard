# Modules

## App Entry
- `app.js`
  - Sets security headers
  - Serves static files
  - Configures session and rate limit
  - Mounts routes and role guards

## Database
- `src/db.js`
  - Reads DB config from env and `data/db-config.json`
  - Creates MySQL pool
  - Tests and saves database settings

## Auth And Roles
- `src/routes/auth.js`
  - Login/logout
  - Stores session user

- `src/middleware/auth.js`
  - `ensureAuth`
  - `ensureRole`

- `src/config/users.js`
  - Persistent users in `data/users.json`
  - bcrypt password hash
  - role validation
  - last active admin protection
  - soft delete support via `deletedAt`

## Telemed Dashboard
- `src/routes/telemed.js`
  - `/telemed`
  - `/telemed/api/summary`
  - `/telemed/export.xlsx`
  - `/telemed/export.pdf`

- `src/services/telemedService.js`
  - Core Telemed SQL and dashboard model

- `views/telemed/dashboard.ejs`
  - Main dashboard page

- `public/js/dashboard.js`
  - Charts, refresh, table view toggle

## Executive Dashboard
- `src/routes/executive.js`
  - `/executive`
  - `/executive/export.pdf`
  - `/executive/department-target-data`
  - `/executive/department-target.xlsx`

- `src/services/executiveService.js`
  - Department target query and model
  - Builds target rows from OPD source / Telemed source mapping

- `src/config/departmentTargets.js`
  - Department target mapping for Executive `เป้าหมายรายห้อง`
  - Defines `display_depcode`, `display_name`, `service_group`, `opd_source_deps`, `telemed_count_deps`, `telemed_mode`, and notes

- `views/executive/dashboard.ejs`
  - Executive tabs and target UI

- `public/js/executive.js`
  - Executive charts and tab switching

## Admin
- `src/routes/settings.js`
  - Database settings

- `src/routes/queryTool.js`
  - SELECT-only Query Tool

- `src/routes/adminUsers.js`
  - User management
  - Supports editing username, display name, role, and active status for non-main-admin accounts

- `src/routes/adminUsersApi.js`
  - `DELETE /api/admin/users/:id`
  - Admin-only soft delete endpoint with protections for main admin, self-delete, and last admin

- `src/routes/todayPatients.js`
  - `/today-patients`
  - `/api/today-patients/summary`
  - `/api/today-patients/ncd-subclinics`
  - `/api/today-patients/ipd-subclinics`
  - `/api/today-patients/er-subclinics`
  - `/admin/today-patients-mapping`
  - `/admin/ncd-subclinics`
  - `/admin/ipd-subclinics`
  - `/admin/er-subclinics`
  - `/api/admin/today-patients/departments`
  - `/api/admin/today-patients/wards`
  - `/api/admin/today-patients/mapping`
  - `/api/admin/ncd-subclinics/departments`
  - `/api/admin/ncd-subclinics/mapping`
  - `/api/admin/ipd-subclinics/wards`
  - `/api/admin/ipd-subclinics/mapping`
  - `/api/admin/er-subclinics/departments`
  - `/api/admin/er-subclinics/mapping`

- `src/services/todayPatientsService.js`
  - Reads HOSxP data with SELECT-only queries and writes mapping only to WebApp runtime file `data/dashboard-service-mapping.json`
  - Stores NCD subclinic mapping in WebApp runtime file `data/dashboard-ncd-subclinic-mapping.json`
  - Stores IPD subclinic mapping in WebApp runtime file `data/dashboard-ipd-subclinic-mapping.json`
  - Reads HOSxP `kskdepartment`, `ward`, `ovst`, and `ipt` with parameter binding
  - Counts OPD/NCD/ER by `ovst.main_dep` and active IPD by `ipt.ward`
  - Counts NCD subclinics `HT`, `DM`, `COPD`, and `CKD` by selected `ovst.main_dep` rooms without ICD10 or clinicmember logic
  - Counts IPD subclinics `หอผู้ป่วยรวม` and `Homeward` by selected `ipt.ward` values where the admission has no discharge date
  - Counts ER subclinics `ฉีดยา/ทำแผล` and `ER Telemed`, returns mapped DEP codes per card, and returns ungrouped ER main rooms not yet mapped to an ER subclinic

- `views/today-patients/dashboard.ejs`
  - Today-patients dashboard with 4 cards plus NCD, IPD, and ER subclinic detail modals

- `views/admin/today-patients-mapping.ejs`
  - Admin mapping UI for OPD/NCD/IPD/ER

- `views/admin/ncd-subclinics.ejs`
  - Admin mapping UI for NCD subclinics

- `views/admin/ipd-subclinics.ejs`
  - Admin mapping UI for IPD subclinics by HOSxP Ward

- `public/js/today-patients.js`
  - Initial load, user-triggered manual refresh only, and NCD/IPD/ER subclinic modal loading
  - NCD subclinic modal compares `main_ncd_total` with the four subclinic totals, renders the ungrouped gap, displays configured/no-patient/not-configured states, and highlights the highest subclinic for the day
  - IPD subclinic modal compares `main_ipd_total` with `หอผู้ป่วยรวม` plus `Homeward`, renders the ungrouped gap, displays configured/no-patient/not-configured states, and highlights the highest IPD subclinic for the day
  - ER subclinic modal compares `main_er_total` with `ฉีดยา/ทำแผล` plus `ER Telemed`, shows mapped DEP codes on each card, and expands ungrouped ER rooms for audit

- `public/js/today-patients-mapping.js`
  - Admin mapping tabs, search, checkbox validation, save, and reset

- `public/js/ncd-subclinics-admin.js`
  - Admin NCD subclinic tabs, search, duplicate depcode protection, and save

- `public/js/ipd-subclinics-admin.js`
  - Admin IPD subclinic tabs, search, duplicate Ward protection, and save

## Shared UI
- `views/partials/sidebar.ejs`
  - Role-aware menu
  - Admin menu is organized into collapsible `ระบบ` and `Dashboard` groups; active child routes, including IPD/NCD subclinic settings, open their group by default

- `views/partials/error-page.ejs`
  - Error card partial

- `public/css/app.css`
  - All UI styling

## Executive Overview
- `src/config/executiveDashboard.js`
  - WebApp-only Executive settings, including bounded `EXECUTIVE_B2C_TARGET_PERCENT` with a default of 50
- `src/config/dashboardTargets.js`
  - Central bounded default for department target percentages; per-room overrides remain in WebApp mapping/config
- `src/services/executiveOverviewService.js`
  - Canonical one-row-per-distinct-Telemed-VN aggregation for hospital-wide KPIs, trend, active service days, disease/channel partitions, main-room reconciliation, previous periods, and aggregate diagnostics
- `src/services/executiveService.js`
  - Fetches configured department target counts and builds valid/no-data/review/anomaly presentation states
  - Sums evaluable OPD, Telemedicine, room targets, and non-offset room shortages from valid rows only
- `src/routes/executive.js`
  - Loads current/previous canonical overview data and the shared department-target model; PDF/Excel reuse those same services
- `views/executive/dashboard.ejs`
  - Separates hospital-wide KPIs from evaluable-room target KPIs and keeps the summary, Top 5, trend, quality status, and department target audit views compact
- `public/js/executive.js`
  - Daily bar/monthly line trend rendering, continuous active-day average, Thai tooltips, department gap charts, loaded-row filtering/dialogs, loading state, and PDF export feedback
- `src/utils/hosxpReadOnly.js`
  - Validates every protected HOSxP pool call before dispatch and logs aggregate read metadata without SQL text, parameters, or patient identifiers
- `src/services/dataQualityService.js` and `src/routes/dataQuality.js`
  - Admin-only aggregate reconciliation view; never serializes patient-level identifiers

## ER Subclinics
- `todayPatientsService`: WebApp mapping, validation, and SELECT-only daily counts.
- `/api/today-patients/er-subclinics`: modal summary API, including `mapped_codes`, `diff_total`, and `ungrouped` room rows.
- `/admin/er-subclinics`: admin mapping page with admin-only APIs.
- `data/dashboard-er-subclinic-mapping.json`: runtime mapping store, excluded from Git.
