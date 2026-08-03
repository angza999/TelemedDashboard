# AI Context - Telemed Dashboard

## Purpose
This project is a read-only Telemedicine dashboard for a hospital. It connects to an existing HOSxP / HOSxP XE MySQL database, summarizes Telemed visits, and presents operational and executive views.

The system must not create, edit, or delete patient service records in HOSxP. All dashboard, export, and query features are intended for reporting and verification only.

## Stack
- Runtime: Node.js
- Framework: Express
- View engine: EJS
- Database: MySQL via `mysql2/promise`
- Frontend: plain JavaScript, Chart.js, Bootstrap Icons
- Export: ExcelJS for Excel, PDFKit for PDF
- Auth/session: `express-session`

## Important Paths
- Entry point: `app.js`
- Database connection: `src/db.js`
- Auth middleware: `src/middleware/auth.js`
- Telemed logic: `src/services/telemedService.js`
- Executive hospital-wide logic: `src/services/executiveOverviewService.js`
- Executive department-target logic: `src/services/executiveService.js`
- HOSxP read-only guard: `src/utils/hosxpReadOnly.js`
- Request correlation: `src/utils/requestContext.js`
- Export logic: `src/services/reportExportService.js`
- Routes: `src/routes/`
- Views: `views/`
- Frontend assets: `public/js/`, `public/css/`
- Runtime private data: `data/` (ignored by git)
- Server deploy docs/scripts: `deploy/`

## Current Main Features
- Login/logout
- Role based access: `admin`, `executive`, `user`
- Telemed Dashboard with KPI, charts, daily/monthly table, refresh, Excel/PDF export
- Executive Dashboard with a canonical hospital-wide distinct-VN overview, a separate valid-evaluable-room target scope, Thai date context for display, and aggregate data-quality explanations without patient identifiers
- Executive department target tab using per-room WebApp target configuration and valid-row-only performance summaries
- Admin aggregate Data Quality page without patient identifiers
- Admin database settings
- Admin Query Tool for SELECT-only checks
- Admin user management with persistent `data/users.json`

## Executive Performance Baseline
- The application is Express/EJS with plain browser JavaScript; React StrictMode is not applicable.
- A normal `/executive` request uses three concurrent, named HOSxP reads: current overview, previous-period overview, and one batched department-target read.
- The Executive frontend has no automatic polling. Filters submit one page request; tabs and loaded-row interactions do not query HOSxP.
- HOSxP diagnostics are aggregate-only and may contain query name, duration, row count, request ID, route, severity, and UTC time. SQL text, parameters, credentials, and patient identifiers must never be logged.
- Fast successful reads are quiet by default in production unless `LOG_HOSXP_READS=true`; `HOSXP_SLOW_QUERY_MS` controls the slow-read threshold and defaults to 1000 ms.

## Deployment Summary
- GitHub repo: `https://github.com/angza999/TelemedDashboard.git`
- Server IP: `192.168.1.231`
- Server project path: `/home/telemed/TelemedDashboard`
- Linux service: `telemed-dashboard`
- App port: `4300`

Common server update:

```bash
cd /home/telemed/TelemedDashboard
git pull origin main
npm install --omit=dev
sudo systemctl restart telemed-dashboard
```

Do not run deployment or restart commands unless the user explicitly requests production deployment. Verify the `telemed-dashboard` process, port `4300`, and `/home/telemed/TelemedDashboard` working directory first; never operate on the separate `itasset` process.
