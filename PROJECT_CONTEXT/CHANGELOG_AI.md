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

### Executive Dashboard
- Added executive overview page for admin/executive.
- Added PDF export for executive report.
- Added tab `เป้าหมายรายห้อง` to compare Telemed count against 50% OPD target by department.
- Improved the `เป้าหมายรายห้อง` tab for executive scanning: total gap KPI, worst-gap card, executive summary, horizontal charts with Top 10/20/all controls, and table progress bars.
- Fixed department target chart sizing so horizontal bars do not become oversized blocks or make the page visually unbalanced.
- Hardened department target chart sizing by disabling Chart.js auto-responsive sizing for these two charts, setting explicit canvas dimensions from the wrapper, and adding cache-busting query strings for Executive assets.
- Refined the `เป้าหมายรายห้อง` executive workflow: added an overall target progress bar, moved Top 5 shortage rooms above charts, kept charts compact with Top 10 default controls, and added table modes `ผู้บริหาร` / `รายละเอียด`.

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
