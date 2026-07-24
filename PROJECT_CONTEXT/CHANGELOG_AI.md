# AI Changelog

## Current Baseline
- Project is on GitHub under `angza999/TelemedDashboard`.
- Linux deployment is configured for server `192.168.1.231`.
- Latest known production path is `/home/telemed/TelemedDashboard`.

## Major Changes Already Implemented

### Telemed Dashboard Core
- Added dashboard for Telemedicine data from HOSxP / HOSxP XE.
- Core Telemed filter uses `ovstist.export_code = '5'`.
- Uses province-style logic for DM/HT and B2B/B2C summary.
- Added date filters, fiscal year support, daily/monthly view, KPI cards, charts, table, refresh, Excel/PDF export.
- Refined the Telemed DM/HT screen into an executive-first UI without changing its data logic: promoted Total/DM/HT/B2B/B2C to primary KPI cards, retained DM/HT B2B/B2C as secondary detail cards, clarified filters/table view, added chart empty/loading feedback and a donut centre summary, and limited B2B technical diagnostics to admins.
- Corrected the Telemed DM/HT chart empty states with explicit `hasAnyTrendData` and `hasB2BData` checks: B2C/HT B2C data now keeps the trend and donut charts visible even when B2B is zero, with a small B2B availability note instead. Added scoped `[hidden]` CSS so Chart.js overlays and donut labels cannot remain visible after JavaScript hides them. Updated the table note and the overall-count column label to `Telemed ทั้งหมด`, and removed the nested vertical scroll limit from the summary table. No Telemed calculation, SQL, API, or HOSxP data access behavior changed.

### Database Settings
- Added admin-only database settings page.
- Saved connection config is stored in `data/db-config.json`.
- Password is not shown back on screen.

### Query Tool
- Added admin-only Query Tool.
- Allows SELECT only.
- Blocks dangerous SQL keywords and multiple statements.
- Limits results to 1000 rows.
- Logs query usage to `data/query-tool.log.jsonl`.
- Supports Excel export of current result.
- Added column-name privacy warning for Query Tool results and export metadata when columns look like patient-identifying data.

### Executive Dashboard
- Added executive overview page for admin/executive.
- Added PDF export for executive report.
- Added tab `เป้าหมายรายห้อง` to compare Telemed count against 50% OPD target by department.
- Improved the `เป้าหมายรายห้อง` tab for executive scanning: total gap KPI, worst-gap card, executive summary, horizontal charts with Top 10/20/all controls, and table progress bars.
- Fixed department target chart sizing so horizontal bars do not become oversized blocks or make the page visually unbalanced.
- Hardened department target chart sizing by disabling Chart.js auto-responsive sizing for these two charts, setting explicit canvas dimensions from the wrapper, and adding cache-busting query strings for Executive assets.
- Refined the `เป้าหมายรายห้อง` executive workflow: added an overall target progress bar, moved Top 5 shortage rooms above charts, kept charts compact with Top 10 default controls, and added table modes `ผู้บริหาร` / `รายละเอียด`.
- Fixed Executive overview trend so `Total Telemed` uses the actual Telemed total rather than DM/HT-only totals.
- Improved PDF reporting for Linux deployments by checking common Thai font paths and clarified that PDF B2B percentage is based on the DM/HT B2B/B2C grouping.
- Reworked the `เป้าหมายรายห้อง` tab for action-first executive scanning: added an Action Required panel above KPIs, made total target gap the primary KPI, changed the second chart to department target gap, added percent/current Telemed to Top 5 rooms, softened B2B data quality warning, and reduced full-row warning weight in the table.
- Renamed the department target chart series from `Telemed จริง` to `จำนวน Telemed ที่ทำได้` for clearer executive wording.
- Updated the `เป้าหมายรายห้อง` tab to use the configured Telemed room master list from the hospital reference sheet, including `depcode`, room name, and `service_group`, instead of showing every HOSxP department.
- Fixed Thai room names in the `เป้าหมายรายห้อง` tab by sending only `depcode` through MySQL and mapping Thai display names/service groups in Node.js after the query to avoid database connection charset issues.
- Improved Executive department target chart sharpness by adding restart-based asset cache busting, waiting for fonts/layout before drawing Chart.js canvases, avoiding hidden-tab rendering, and forcing resize/update after tab or chart-limit changes.
- Refined Executive department target wording and filters: renamed visible `Telemed ทั้งหมด` labels to `จำนวน Telemed ที่ทำได้`, clarified `สัดส่วน Telemed ต่อ OPD` versus `ความคืบหน้าสู่เป้าหมาย`, added service-group quick filters, improved chart tooltips/end labels, shortened table statuses, and aligned Excel export wording.
- Added a hospital-specific calculation rule for `OPD Telemed` (`depcode 080`) in the Executive department target tab: OPD total comes from `main_dep = 111`, while Telemed achieved counts only B2C Telemed from `main_dep IN (111, 080)`, with the same values flowing to table, summary, charts, and Excel export.
- Reworked the Executive department target tab to use a central OPD-source/Telemed-source mapping for every row. Rows now come from `src/config/departmentTargets.js`, count OPD from `opd_source_deps`, count Telemed achieved from `telemed_count_deps` using `B2C_ONLY` or `B2B_ONLY`, keep zero-data rooms visible, and export source/mode/note columns to Excel.
- Hid the duplicate `ER Telemed` (`082`) target row and kept its `004,082` Telemed source counted under `อุบัติเหตุ - ฉุกเฉิน` only, so executive reporting does not show the same emergency source pair twice.
- Hid the duplicate `กายภาพบำบัด(รองเท้ารองช้ำ)` (`078`) target row and rolled its OPD/Telemed sources into `กายภาพบำบัด` (`037`), so the Executive target tab shows one physical therapy row without losing the `078` totals.
- Added room `067` into the `จิตเวช Telemed` calculation and room `051` into the `อุบัติเหตุ - ฉุกเฉิน` calculation for both OPD target source and Telemed achieved source in the Executive department target mapping.
- Updated `PHDTelemed` (`079`) to calculate OPD from rooms `029,076,055,047,065,050,024,006,046,025,020` and count Telemed achieved from those rooms plus `079`.

### Today Patients Dashboard
- Added `/today-patients` for admin/executive users with four near-real-time cards: OPD, NCD, IPD, and ER.
- Added `/api/today-patients/summary`, which reads WebApp mapping first and then queries HOSxP read-only tables with parameter binding.
- Added Admin > `ตั้งค่าผู้รับบริการวันนี้` for selecting OPD/NCD/ER departments and IPD wards without editing code.
- Added JSON-backed runtime mapping storage at `data/dashboard-service-mapping.json`; the app does not create tables or write configuration into HOSxP.
- Removed the optional mapping SQL template to keep the deployment contract clear: HOSxP is read-only and the dashboard only displays summarized data.
- Changed `/today-patients` refresh behavior from automatic 30-second polling to user-triggered manual refresh only.
- Refined `/today-patients` UI for executive scanning: compact status panel, clearer manual refresh affordance, larger card numbers, baseline-aligned `คน` units, balanced card spacing, and a reliable IPD building icon.
- Moved the `/today-patients` manual-refresh helper text into the right-side refresh action area so the date/status line stays compact.
- Added NCD subclinic drill-down on the `/today-patients` NCD card with a modal for `HT`, `DM`, `COPD`, and `CKD`.
- Added Admin > `ตั้งค่าคลินิกย่อย NCD` using WebApp JSON storage `data/dashboard-ncd-subclinic-mapping.json`; HOSxP remains read-only and is queried with SELECT-only `ovst.main_dep` counts.
- Refined the `/today-patients` NCD subclinic modal as an executive mini-dashboard: it now compares main NCD vs subclinic totals, shows an ungrouped/mapping gap, explains mismatches with data-quality notes, separates configured/no-patient/not-configured states, highlights the highest subclinic of the day, and uses distinct soft visual themes per subclinic.
- Added IPD subclinic drill-down on the `/today-patients` IPD card with a modal for `หอผู้ป่วยรวม` and `Homeward`; it compares main IPD vs subclinic totals and uses active inpatient counts from HOSxP `ipt` with discharge-date checks.
- Added Admin > `ตั้งค่าคลินิกย่อย IPD` using WebApp JSON storage `data/dashboard-ipd-subclinic-mapping.json`; HOSxP remains read-only and is queried with SELECT-only `ward` and `ipt` reads.
- Reorganized the admin sidebar into collapsible `ระบบ` and `Dashboard` groups, shortened admin menu labels, and kept active groups open for easier navigation as admin settings grow.

### User Management
- Added persistent user management via `data/users.json`.
- Admin can add/edit users, reset password, toggle active/inactive.
- User edit form now allows changing usernames for non-main-admin accounts while keeping duplicate username validation and locking the main `admin` username.
- Passwords are hashed with bcryptjs.
- Last active admin cannot be disabled or demoted.
- Added admin-only soft delete for users through `DELETE /api/admin/users/:id`, including confirmation modal, red delete action, UI count update, and protections for main admin, self-delete, and last admin.

### Login and Session
- Added a central session helper for the role-based start route, safe post-login return URLs, and consistent `telemed.sid` cookie options.
- Opening `/login` with an existing session now redirects to `/today-patients` for `admin`/`executive` and `/telemed` for `user`; a stale login form cannot replace an active session.
- Successful login regenerates and saves the session before redirecting, storing only `id`, `username`, `name`, and `role`.
- Logout now destroys the session and clears the matching cookie options. Protected requests also invalidate sessions for deleted or inactive users, so other tabs return to login after their next request.
- Session cookies use `httpOnly`, `sameSite=lax`, a configurable eight-hour default, and enable `secure` only when production HTTPS is explicitly configured with `USE_HTTPS=true`.
- Hardened `/login` against stale sessions: an inactive, deleted, or missing WebApp user is now cleared before the login page is rendered, preventing a redirect loop between `/login` and protected pages.
- Added opt-in safe auth event logging via `LOG_AUTH_EVENTS=true` and `npm run ensure-admin` to create or repair the WebApp admin account without touching HOSxP. Existing admin passwords are reset only when `RESET_ADMIN_PASSWORD=true` is explicitly set.

### Deployment Fixes
- Added Linux deploy scripts and systemd service.
- Added config switches:
  - `ENABLE_HSTS=false`
  - `ENABLE_HTTPS_UPGRADE=false`
- These prevent Chrome/Edge from forcing HTTPS on LAN HTTP deployment.

## Commit Reference
Use `git log -1 --oneline` for the latest commit. This file records feature history and should be updated with every project change.

## 2026-07-08 - ER Subclinic Drill-down
- Added ER card drill-down with exactly `ฉีดยา/ทำแผล` and `ER Telemed`.
- Added Admin ER mapping stored in WebApp JSON with default DEP strings `051` and `082`.
- HOSxP remains read-only; counts use `COUNT(DISTINCT ovst.vn)` by `ovst.main_dep` for `CURDATE()`.
- Improved the ER subclinic modal audit view: each subclinic card now shows mapped DEP codes, and the `ยังไม่จัดกลุ่ม` summary can expand to show ER main rooms that are not yet mapped to an ER subclinic.

## 2026-07-23 - Telemed Dashboard Final UX Polish
- Unified the initial Telemed page render and manual refresh through the same `renderDashboard` path so KPI cards, category details, charts, donut, table, query metadata, and export links all use one response snapshot.
- Reduced vertical padding and gaps in the HOSxP query information, B2B alert, status message, and filter panel to expose KPI and chart content sooner on notebook screens.
- Kept the main B2B warning non-technical for every role; only admin users see the small source-field hint for `ovstist.name` and `opdscreen.cc`.
- Shortened repeated B2B chart notes while retaining the full explanation in the top alert.
- No Telemed calculation, SQL, API, login/session, or HOSxP data changes were made.

## 2026-07-24 - Executive Dashboard Modernization
- Reorganized the Executive overview into a compact hospital dashboard with Thai KPI labels, consistent `ครั้ง` units, comparison with the immediately preceding period, average per day, highest/lowest service day, and configurable B2C target status.
- Added decision-focused insights, a trend chart with average line and peak marker, a corrected B2B/B2C donut summary, compact DM/HT comparison bars, and Top 5 Telemed rooms sourced from the existing department-target dataset.
- Added visible loading states for filters and PDF export with success/error feedback.
- Expanded the department-target KPI summary with total visible rooms, room success rate, and the best-performing visible department.
- Added WebApp-only `EXECUTIVE_B2C_TARGET_PERCENT` configuration with a default of 50; no configuration is written to HOSxP.
- Reused the existing parameterized Telemed summary query for current and previous periods. No Telemed formula, SQL definition, login/session, role rule, or HOSxP data was changed.
