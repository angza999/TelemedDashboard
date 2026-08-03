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

## Sidebar Flow
1. `views/partials/sidebar.ejs` receives the `active` page key from each EJS page.
2. Non-admin users see only their permitted dashboard links; the Admin section is rendered only when `currentUser.role === 'admin'`.
3. Admin links are grouped into `ระบบ` (`settings`, `query-tool`, `users`) and `Dashboard` (`today-patients-mapping`, `ncd-subclinics`, `ipd-subclinics`).
4. The group containing the active child route is opened by default with native `<details>` behavior; backend routes still enforce admin permissions separately.

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
2. Route starts the current overview, previous-period overview, and department-target reads concurrently.
3. `fetchDepartmentTargetData()` loads rows from `src/config/departmentTargets.js` and sends one parameterized `UNION ALL` batch read for all configured rooms.
4. The batched result preserves the existing per-room OPD sources, Telemed source mappings, and `B2C_ONLY` / `B2B_ONLY` conditions before the existing KPI normalization runs.
5. If target SQL mapping fails, overview still renders and target tab shows a mapping message.
6. Target tab shows Action Required, executive summary, overall target progress, KPI, Top 5 shortage rooms, compact charts, and a department table with `ผู้บริหาร` / `รายละเอียด` modes.

## Executive Overview Flow
1. User requests `/executive?tab=overview` with an inclusive ISO date range and day/week/month granularity; the browser submits ISO values while the page and PDF display the same period with shared Thai date helpers.
2. `executiveOverviewService` reads canonical Telemedicine rows from HOSxP through the protected read-only pool and reduces them to one row per distinct Telemedicine VN.
3. The same canonical current-period model supplies the hospital KPI, trend, active service days, disease/channel partitions, main-room coverage, data-quality checks, and Executive PDF.
4. The view presents that snapshot in one sequence: compact filters with Thai date context, scoped KPI cards, per-room target progress, hospital-wide trend plus valid below-target Top 5, a three-line decision insight, collapsed eight-item supporting details, and aggregate data quality.
5. Filter submission marks the active panel busy. Empty/error responses replace analytical content with compact states; they do not render zero-valued KPIs as if they were real observations.
6. `executiveService` separately loads department-target rows. Only valid evaluable rows supply OPD, Telemedicine achieved, room targets, rate, and target shortage; no-data/review/anomaly rows remain audit-only.
7. Total room shortage is the sum of each valid room's positive shortfall. An over-target room is retained as excess audit evidence but does not offset another room's shortage.
8. Daily charts render bars and no-service dates as `null`; monthly charts render a line. The average uses active service days only and remains a continuous presentation line.
9. The screen and PDF receive the same aggregate models. Neither path exposes patient identifiers or writes to HOSxP.
10. A normal page load therefore performs three named HOSxP reads: `executive_overview_current`, `executive_overview_previous`, and `executive_department_targets`. There is no browser polling or idle refresh.

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
10. Clicking the IPD card opens a modal and calls `/api/today-patients/ipd-subclinics`.
11. IPD subclinic counts read `data/dashboard-ipd-subclinic-mapping.json`, then count HOSxP `ipt.ward` by selected Ward codes where the admission has no discharge date, using SELECT only.
12. The modal compares `main_ipd_total` from the main IPD mapping with the summed IPD subclinic total; `ungrouped = max(main_ipd_total - subclinic_total, 0)` and negative gaps are shown as a mapping check.
13. Clicking the ER card opens a modal and calls `/api/today-patients/er-subclinics`.
14. ER subclinic counts read `data/dashboard-er-subclinic-mapping.json`, then count HOSxP `ovst.main_dep` by selected DEP codes using SELECT only.
15. The ER modal compares `main_er_total` from the main ER mapping with `ฉีดยา/ทำแผล` plus `ER Telemed`, shows mapped DEP codes on each card, and expands `ungrouped` room details for ER main DEP codes that are not yet mapped to an ER subclinic.
16. If the API fails, the page keeps the last successful numbers and shows a connection warning.

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

## IPD Subclinic Admin Mapping Flow
1. Admin opens `/admin/ipd-subclinics`.
2. UI calls Admin APIs to read HOSxP wards and WebApp IPD subclinic mapping.
3. Admin selects Ward codes for `หอผู้ป่วยรวม` and `Homeward`.
4. Frontend and backend validate that the same Ward code is not active in more than one IPD subclinic at the same time.
5. Save writes only `data/dashboard-ipd-subclinic-mapping.json`; it never writes to HOSxP and never creates HOSxP tables.
6. The next IPD modal refresh on `/today-patients` uses the new subclinic mapping.

## Admin User Flow
1. Admin opens `/admin/users`.
2. Route reads users from `data/users.json`.
3. Admin can create/edit/reset/toggle/delete. Username editing is allowed for non-main-admin accounts; the main `admin` username is locked.
4. Passwords are hashed.
5. Delete uses `DELETE /api/admin/users/:id` and performs a WebApp-only soft delete by setting `deletedAt`, `deletedBy`, and `isActive = false`.
6. Main `admin`, the current session user, and the last admin cannot be deleted.
7. Last active admin cannot be disabled or demoted.

## Executive Overview Presentation Flow
1. `/executive?tab=overview` loads the existing canonical Executive overview aggregate and department-target aggregate for the selected period.
2. The screen renders hospital-wide Telemedicine separately from valid evaluable-room OPD, Telemedicine, target, rate, and shortage so scopes cannot be mixed in the UI.
3. Day, week, and month trend grouping happens in application memory after the reporting result is loaded. Weekly periods begin on Monday.
4. Target progress, decision summary, Top 5 follow-up, trend, support metrics, and export render from the same response snapshot.
5. `/executive?tab=department-target` uses the existing loaded room data for name search, status filtering, A-Z sorting, previews, and dialogs. These local actions do not issue HOSxP queries.
6. HOSxP remains reporting-read-only throughout this flow; no executive interaction creates tables or writes HOSxP data.

## ER Subclinic Flow
1. Clicking the ER card calls `/api/today-patients/er-subclinics`.
2. Service reads `data/dashboard-er-subclinic-mapping.json` and counts distinct HOSxP `ovst.vn` by mapped `main_dep` codes for today.
3. Service also reads the main ER mapping from `data/dashboard-service-mapping.json`, subtracts active ER subclinic DEP codes, and uses a SELECT-only grouped query to return ER main rooms that are not yet mapped to subclinics.
4. Modal compares unchanged main ER total with the two ER subclinic totals, shows mapped DEP codes under each subclinic card, and lets users expand `ยังไม่จัดกลุ่ม` when a positive gap exists.
5. Admin opens `/admin/er-subclinics`, assigns DEP rooms, and saves through admin-only APIs.
6. Save writes only the WebApp JSON file; HOSxP is never modified.
