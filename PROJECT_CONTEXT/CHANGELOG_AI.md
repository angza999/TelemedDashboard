# AI Changelog

## 2026-08-02 - Executive read performance audit
- Traced `/executive` end to end and confirmed that the repeated HOSxP log entries came from one current overview read, one previous-period read, and twelve sequential department-target room reads; there was no frontend polling, duplicate event handler, React, or StrictMode replay.
- Replaced the twelve target round trips with one parameterized `UNION ALL` batch while retaining the same room mappings, channel conditions, target formulas, and KPI normalization.
- Started current overview, previous overview, and department-target reads concurrently and added aggregate-only request correlation, query names, durations, row counts, and safe error metadata.
- Added regression coverage for batched target execution and secure read logging. Read-only DEV verification reconciled every KPI and department row before and after the change.
- No business formula, API response contract, authentication rule, `.env`, HOSxP data, deployment, server process, commit, or push was changed by this audit.

- Refined the Executive overview decision hierarchy without changing SQL, API contracts, HOSxP access, or formulas: clarified the separate hospital-wide and evaluable-room scopes, placed the per-room target progress ahead of the trend/Top 5 decision grid, moved supporting metrics into collapsed details, and added aggregate issue categories with executive-facing impact text.
- Standardized the Executive display period using shared Thai date helpers while retaining browser-native ISO query values, and updated the Top 5 follow-up list with explicit achieved, target, gap, progress, and status evidence.

- Refined the Executive overview presentation without changing data semantics: shortened the five KPI labels, standardized `ห้องที่ประเมิน`, made the summary three decision-focused lines, compacted Top 5 rows into rank/room/achieved/target/gap/status, clarified the daily/monthly hospital trend, and arranged supporting metrics as an 8-item responsive grid. No SQL, API contract, target formula, HOSxP write, deployment, commit, or push was performed.
- Finalized Executive overview interpretation safeguards: kept no-service visit dates as chart gaps while making the canonical active-day average line continuous, added shared Thai Buddhist-date helpers for UI/tooltips/PDF, reused tied high/low extremes for KPI and chart highlights, clarified the `ovst.main_dep` Top 5 basis, and expanded the reconciliation/regression tests to 24 cases. No SQL, Telemed formula, HOSxP data, deployment, or server process was changed.
- Refined Executive overview analytics without changing the canonical Telemed totals: exposed the non-DM/HT group, clarified complete channel data when B2B is zero, documented the configurable B2C target denominator, retained tied highest/lowest service dates, represented no-service calendar days as chart gaps, and made Top 5 main-room reconciliation auditable. HOSxP access remains read-only.

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
- Reordered the Executive overview for five-second scanning: moved the compact Top 5 Telemed rooms directly below KPI cards beside Executive Insights, clarified the equal-length previous-period comparison, added a caution when the minimum day is the selected range's last day, localized trend tooltips, and limited ICD-code detail hints to admins. The Telemed calculation and HOSxP SQL were not changed.
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
- Polished the Executive Top 5 room panel with a same-period Top 5 coverage total and derived `อื่น ๆ` count, clearer Thai ranking copy, a B2C 50% target tooltip, and an explicit equal-length previous-period note. No query, calculation formula, or HOSxP access behavior changed.

## 2026-07-24 - Executive Department Target UX Safety
- Reorganized the `เป้าหมายรายห้อง` tab into a compact action-first layout: compact filters, one Action Required summary, seven KPI cards in a balanced desktop grid, a ranked follow-up list, focused charts, and an executive-first table with search and Top 10 default. Numeric table values are right-aligned for easier comparison.
- Added presentation-only data-quality classification for rows with no OPD base or Telemed greater than OPD. These rows remain visible in `ข้อมูลควรตรวจสอบ` and the detailed table, but are excluded from pass/fail interpretation, performance highlights, and target-gap charts.
- Kept the existing OPD/Telemed counting, target formula, parameterized SQL, and HOSxP read-only access unchanged. Excel now uses the same display status for these rows.
- Added presentation-only risk levels and Thai quick recommendations, contextual formula tooltips, and a drill-down room modal that uses the already-loaded target rows. The modal reserves daily room trends for a future phase so this page does not add HOSxP queries.

## 2026-07-27 - Executive Department Target Interaction Polish
- Added client-side actionable KPI behavior, status chips, a clear-filter action, compact sticky summary, and an on-demand total-gap breakdown. Each interaction reuses the loaded department target result set and does not add a HOSxP request.
- Added compact room previews for pointer and keyboard users, with click-to-open detail dialogs on touch devices. Detail and gap dialogs now support Escape, focus trapping, and restoring focus to the originating control.
- Added a dedicated near-target list and ensured anomaly rows are excluded from Top 5 performance highlights. Updated executive wording so technical mapping details remain confined to admin-specific views.
- Completed interaction polish with a source-backed action recommendation, no-data success states for near-target and data-quality sections, an open-by-default collapsible data-quality list, keyboard-labelled formula hints, and reduced-motion-safe scrolling/transitions. No SQL, HOSxP write operation, new endpoint, or target formula change was introduced.

## 2026-07-27 - Executive Department Target Final State Polish
- Separated neutral `ไม่มีข้อมูล` rows (OPD=0 and Telemed=0) from review/anomaly rows, while keeping all rows available for audit in the existing table and data-quality section.
- Limited passed, near-target, failed, follow-up, and performance chart interpretation to valid rows. Review/anomaly/no-data rows no longer inflate performance status counts.
- Added a dedicated no-data status filter and neutral table/export wording, compact chart empty states, a compact near-target empty state, and a less repetitive action/sticky summary.
- Preserved the existing per-room `CEIL(OPD * 0.50)` target formula, parameter-bound reporting SQL, routes, and HOSxP read-only behavior. No deployment, server restart, commit, or push was performed.

## 2026-07-27 - Executive Department Target Metric Hierarchy
- Reorganized the existing department-target summary into four primary metrics plus compact gap and status widgets, without changing the underlying values or target formula.
- Preserved the existing client-side actions: gap opens its breakdown, status rows filter the loaded table, and `ดูทั้งหมด` clears local filters before scrolling to the table.
- Refined the Top 5 follow-up block as a ranked list with normalized mini gap bars, real shortage values, risk badges, and a visible room count.
- Kept `no_data`, `review`, and `anomaly` rows out of performance rankings while retaining them in the audit workflow.
- Verified the updated tab locally at a 1280x720 viewport, including gap and room dialogs, failed/all table filters, chart/table/export/sticky-summary presence, and regression routes `/executive?tab=overview` and `/telemed`.
- No SQL, API, service, login/session, HOSxP write, deployment, server restart, commit, or push was performed.

## 2026-07-27 - Executive Department Target Insight Polish
- Replaced the duplicate shortage hero in `ต้องดำเนินการ` with a compact insight strip that shows Telemed-to-OPD performance, the distance from the 50% target, and the existing data-derived recommendation.
- Added the existing near-target count to the status widget, while preserving local passed/near/failed/data-check filtering and the compact sticky-summary behavior.
- Reduced the zero near-target state to one inline row, converted review/anomaly items to a divided list, and separated neutral no-data rooms into a gray disclosure collapsed by default.
- Added synchronized `aria-expanded` state and explicit Enter/Space handling to the no-data disclosure, without adding a query or changing any target calculation.
- Rechecked the ranked Top 5 list, normalized mini gap bars, status filters, `ดูทั้งหมด`, room dialog focus restoration, Excel action, overview route, Telemed route, and Browser Console.
- No SQL, API, service, login/session, HOSxP write, deployment, server restart, commit, or push was performed.

## 2026-07-28 - Executive Department Target Final UI Polish
- Tightened the department-target filter panel for notebook widths, including a wrapped action row that keeps Export Excel inside the page instead of producing horizontal overflow.
- Kept the existing action recommendation but presented it as a compact two-column insight strip with Telemed-to-OPD performance and distance from the target.
- Refined the KPI/gap/status hierarchy, the ranked Top 5 follow-up rows, the compact near-target empty state, the divided data-review list, chart headings, and sticky-summary transition behavior.
- Verified the department-target page locally at notebook and Full HD widths, checked the Top 20 chart control, sticky-summary state, existing Executive overview, Telemed route, and browser console.
- No calculation, SQL, API, service, login/session, HOSxP access, deployment, server restart, commit, or push was changed or performed.

## 2026-07-24 - Server / PM2 Deployment Context
- Added root `AGENTS.md` as the operational reference for the shared server `192.168.1.231`.
- Documented the separate project paths, ports, PM2 process names, preflight checks, health checks, deployment commands, and Git safety rules for ITASSET (`itasset`, port `3000`) and Telemed Dashboard (`telemed-dashboard`, port `4300`).
- Explicitly warns that using PM2 process `itasset` for Telemed Dashboard can stop the ITASSET application. Documentation-only change; no server process, HOSxP data, `.env`, or application logic was modified.

## 2026-08-01 - Executive Dashboard Final Scope And Metric Governance
- Separated the Executive KPI hierarchy into one hospital-wide distinct-VN Telemedicine total and four evaluable-room target measures with explicit `ครั้ง` units.
- Reworked the executive summary into at most three decision-focused lines and retained Top 5 follow-up rooms from valid below-target rows only.
- Changed the daily trend to bars and the monthly trend to a line, kept no-service dates as `null`, rendered the active-service-day average continuously, highlighted only one highest period, and kept low periods neutral.
- Added the Executive trend and quality summary to PDF output using the same loaded aggregate services as the screen.
- Corrected total target shortage to `SUM(MAX(room target - room Telemed, 0))`; over-target rooms no longer offset another room's shortage. Net difference remains available only as an audit field.
- Evaluable OPD, Telemedicine, target, and rate now exclude neutral no-data and review/anomaly rows while retaining those rows in the audit presentation.
- Added governance tests for scope wording, non-offset shortages, valid-row aggregation, daily/monthly chart semantics, HOSxP read-only enforcement, null dates, active-day averages, and reconciliation.
- No HOSxP SQL formula, HOSxP schema/data, login/session, production deployment, PM2 process, commit, or push was changed or performed.

## 2026-08-01 - Executive Dashboard Decision Hierarchy Refresh
- Reframed the Executive overview around four evaluable-room KPIs: OPD base, achieved Telemedicine, summed per-room targets, and Telemedicine-to-OPD ratio. The hospital-wide Telemedicine total remains separately scoped to avoid mixing hospital and target-room denominators.
- Added a compact target-progress panel showing achieved, target, and non-offset shortage from the same loaded department-target aggregate. The visual progress bar is capped at 100 percent while the displayed percentage remains truthful.
- Added weekly grouping to the existing overview response in memory. It uses Monday-start periods and does not introduce a new database query, SQL formula, API contract, or HOSxP write operation.
- Kept the department-target workflow client-side for room search and A-Z sorting, refined room/table terminology, and strengthened mobile table presentation without a nested table scrollbar.
- Added regression coverage for weekly presentation grouping and updated governance expectations. `npm test` passes 48 tests.
- No HOSxP SQL, schema, or data was changed. No deployment, PM2 restart, commit, or push was performed.

## 2026-08-02 - Executive Overview UX And Design QA Polish
- Added visible Thai Buddhist date labels to both Executive date filters while retaining ISO request values and timezone-safe date-only parsing.
- Replaced the overview follow-up comparison table with a compact maximum-five ranked list showing room gap, achieved/target context, and accessible progress.
- Clarified achieved-to-target progress with a teal bar, neutral remainder, truthful text, and ARIA values; the calculation remains evaluated Telemedicine divided by the summed per-room target.
- Standardized the trend to teal and added a `สูงสุด` label plus peak tooltip instead of using an unexplained orange highlight.
- Reduced the decision summary to two lines, kept additional information collapsed by default, and retained aggregate-only data-quality messaging.
- Verified 48 automated tests, JavaScript syntax, EJS compilation, browser console, and responsive layouts at 1024, 768, and 375 pixels without horizontal page overflow.
- No SQL, API contract, HOSxP schema/data, login/session, deployment, PM2 restart, commit, or push was changed or performed.
