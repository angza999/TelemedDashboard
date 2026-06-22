# System Flow

## Request Flow
1. User opens app.
2. `app.js` redirects `/` to `/login` or `/telemed`.
3. Login route checks `data/users.json`.
4. Session stores:
   - `id`
   - `username`
   - `name`
   - `role`
5. Route middleware checks authentication and role.
6. Route calls service.
7. Service reads HOSxP through MySQL pool.
8. EJS renders HTML.
9. Frontend JS renders charts and interactive table behavior.

## Telemed Dashboard Flow
1. User requests `/telemed`.
2. `src/routes/telemed.js` parses filters.
3. `fetchTelemedSummary()` runs province-aligned SQL.
4. `buildDashboardModel()` computes KPI, trend, table rows.
5. `views/telemed/dashboard.ejs` renders page.
6. `public/js/dashboard.js` manages charts, refresh, table toggle.

## Export Flow
1. User clicks export.
2. Route parses the same filters.
3. Route calls the same service as dashboard.
4. `reportExportService.js` writes Excel/PDF.

## Executive Target Flow
1. User requests `/executive?tab=department-target`.
2. Route loads normal executive overview data.
3. Route also calls `fetchDepartmentTargetData()`.
4. `fetchDepartmentTargetData()` loads rows from `src/config/departmentTargets.js`, counts OPD from `opd_source_deps`, counts Telemed achieved from `telemed_count_deps`, and applies `B2C_ONLY` / `B2B_ONLY`.
5. If target SQL mapping fails, overview still renders and target tab shows a mapping message.
6. Target tab shows Action Required, executive summary, overall target progress, KPI, Top 5 shortage rooms, compact charts, and a department table with `ผู้บริหาร` / `รายละเอียด` modes.

## Today Patients Flow
1. Admin or executive opens `/today-patients`.
2. Page loads immediately, then `public/js/today-patients.js` calls `/api/today-patients/summary`.
3. `fetchTodayPatientsSummary()` reads active mapping from `data/dashboard-service-mapping.json`.
4. OPD/NCD/ER are counted from HOSxP `ovst` by `vstdate = CURDATE()` and `main_dep IN (...)`.
5. IPD is counted from HOSxP `ipt` by selected ward and no discharge date.
6. The browser updates four cards on initial load and only refreshes again when the user clicks `รีเฟรชข้อมูล`.
7. Clicking the NCD card opens a modal and calls `/api/today-patients/ncd-subclinics`.
8. NCD subclinic counts read `data/dashboard-ncd-subclinic-mapping.json`, then count HOSxP `ovst.main_dep` by selected DEP codes using SELECT only.
9. The modal compares `main_ncd_total` from the main NCD mapping with the summed subclinic total; `ungrouped = max(main_ncd_total - subclinic_total, 0)` and negative gaps are shown as a mapping check.
10. If the API fails, the page keeps the last successful numbers and shows a connection warning.

## Today Patients Admin Mapping Flow
1. Admin opens `/admin/today-patients-mapping`.
2. UI calls Admin APIs to read HOSxP departments, HOSxP wards, and WebApp mapping.
3. Admin selects which DEP codes feed OPD/NCD/ER and which WARD codes feed IPD.
4. Backend validates that the same DEP code is not active in OPD/NCD/ER at the same time.
5. Save writes only `data/dashboard-service-mapping.json`; it never writes to HOSxP and never creates HOSxP tables.
6. The next refresh of `/today-patients` uses the new mapping.

## NCD Subclinic Admin Mapping Flow
1. Admin opens `/admin/ncd-subclinics`.
2. UI calls Admin APIs to read HOSxP departments and WebApp NCD subclinic mapping.
3. Admin selects DEP codes for `HT`, `DM`, `COPD`, and `CKD`.
4. Frontend and backend validate that the same DEP code is not active in more than one NCD subclinic at the same time.
5. Save writes only `data/dashboard-ncd-subclinic-mapping.json`; it never writes to HOSxP and never creates HOSxP tables.
6. The next NCD modal refresh on `/today-patients` uses the new subclinic mapping.

## Admin User Flow
1. Admin opens `/admin/users`.
2. Route reads users from `data/users.json`.
3. Admin can create/edit/reset/toggle/delete. Username editing is allowed for non-main-admin accounts; the main `admin` username is locked.
4. Passwords are hashed.
5. Delete uses `DELETE /api/admin/users/:id` and performs a WebApp-only soft delete by setting `deletedAt`, `deletedBy`, and `isActive = false`.
6. Main `admin`, the current session user, and the last admin cannot be deleted.
7. Last active admin cannot be disabled or demoted.
