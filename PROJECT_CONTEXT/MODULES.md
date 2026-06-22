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
  - `/admin/today-patients-mapping`
  - `/admin/ncd-subclinics`
  - `/api/admin/today-patients/departments`
  - `/api/admin/today-patients/wards`
  - `/api/admin/today-patients/mapping`
  - `/api/admin/ncd-subclinics/departments`
  - `/api/admin/ncd-subclinics/mapping`

- `src/services/todayPatientsService.js`
  - Reads HOSxP data with SELECT-only queries and writes mapping only to WebApp runtime file `data/dashboard-service-mapping.json`
  - Stores NCD subclinic mapping in WebApp runtime file `data/dashboard-ncd-subclinic-mapping.json`
  - Reads HOSxP `kskdepartment`, `ward`, `ovst`, and `ipt` with parameter binding
  - Counts OPD/NCD/ER by `ovst.main_dep` and active IPD by `ipt.ward`
  - Counts NCD subclinics `HT`, `DM`, `COPD`, and `CKD` by selected `ovst.main_dep` rooms without ICD10 or clinicmember logic

- `views/today-patients/dashboard.ejs`
  - Real-time dashboard with 4 cards and NCD subclinic detail modal

- `views/admin/today-patients-mapping.ejs`
  - Admin mapping UI for OPD/NCD/IPD/ER

- `views/admin/ncd-subclinics.ejs`
  - Admin mapping UI for NCD subclinics

- `public/js/today-patients.js`
  - Initial load, user-triggered manual refresh only, and NCD subclinic modal loading
  - NCD subclinic modal compares `main_ncd_total` with the four subclinic totals, renders the ungrouped gap, displays configured/no-patient/not-configured states, and highlights the highest subclinic for the day

- `public/js/today-patients-mapping.js`
  - Admin mapping tabs, search, checkbox validation, save, and reset

- `public/js/ncd-subclinics-admin.js`
  - Admin NCD subclinic tabs, search, duplicate depcode protection, and save

## Shared UI
- `views/partials/sidebar.ejs`
  - Role-aware menu

- `views/partials/error-page.ejs`
  - Error card partial

- `public/css/app.css`
  - All UI styling
