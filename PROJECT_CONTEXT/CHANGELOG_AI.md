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

### User Management
- Added persistent user management via `data/users.json`.
- Admin can add/edit users, reset password, toggle active/inactive.
- Passwords are hashed with bcryptjs.
- Last active admin cannot be disabled or demoted.

### Deployment Fixes
- Added Linux deploy scripts and systemd service.
- Added config switches:
  - `ENABLE_HSTS=false`
  - `ENABLE_HTTPS_UPGRADE=false`
- These prevent Chrome/Edge from forcing HTTPS on LAN HTTP deployment.

## Commit Reference
Use `git log -1 --oneline` for the latest commit. This file records feature history and should be updated with every project change.
