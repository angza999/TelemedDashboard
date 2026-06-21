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

- `src/routes/todayPatients.js`
  - `/today-patients`
  - `/api/today-patients/summary`
  - `/admin/today-patients-mapping`
  - `/api/admin/today-patients/departments`
  - `/api/admin/today-patients/wards`
  - `/api/admin/today-patients/mapping`

- `src/services/todayPatientsService.js`
  - Reads HOSxP data with SELECT-only queries and writes mapping only to WebApp runtime file `data/dashboard-service-mapping.json`
  - Reads HOSxP `kskdepartment`, `ward`, `ovst`, and `ipt` with parameter binding
  - Counts OPD/NCD/ER by `ovst.main_dep` and active IPD by `ipt.ward`

- `views/today-patients/dashboard.ejs`
  - Real-time dashboard with 4 cards

- `views/admin/today-patients-mapping.ejs`
  - Admin mapping UI for OPD/NCD/IPD/ER

- `public/js/today-patients.js`
  - Initial load and user-triggered manual refresh only

- `public/js/today-patients-mapping.js`
  - Admin mapping tabs, search, checkbox validation, save, and reset

## Shared UI
- `views/partials/sidebar.ejs`
  - Role-aware menu

- `views/partials/error-page.ejs`
  - Error card partial

- `public/css/app.css`
  - All UI styling
