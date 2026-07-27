# Telemed Dashboard Agent Context

## Server / PM2 / Deployment Context

Server: `192.168.1.231`
Server user: `telemed`

Two independent applications run on the same server. Treat their project paths,
ports, and PM2 process names as separate deployment targets.

| Application | Project path | PM2 process | Port | URL |
| --- | --- | --- | --- | --- |
| ITASSET | `/home/telemed/it-asset-app-itservice` | `itasset` | `3000` | `http://192.168.1.231:3000` |
| Telemed Dashboard | `/home/telemed/TelemedDashboard` | `telemed-dashboard` | `4300` | `http://192.168.1.231:4300` |

### Critical Safety Rules

- Never use PM2 process `itasset` for Telemed Dashboard. It restarts the ITASSET application.
- Never use PM2 process `telemed-dashboard` for ITASSET.
- Do not restart, delete, stop, or kill a process until its PM2 `exec cwd` and port have been verified.
- ITASSET owns port `3000`; Telemed Dashboard owns port `4300`. Do not configure both applications on one port.
- For `EADDRINUSE`, identify the process and its project path first. Do not kill a process solely because it is listening on port `3000` or `4300`.

### Verify Before Any Deploy or Restart

Run these commands on the server before changing either application:

```bash
pm2 status
pm2 show itasset
pm2 show telemed-dashboard
sudo ss -ltnp | grep -E ':3000|:4300'
```

Expected PM2 working directories:

```text
itasset             -> /home/telemed/it-asset-app-itservice
telemed-dashboard   -> /home/telemed/TelemedDashboard
```

Health checks:

```bash
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1:4300/login
curl -I http://127.0.0.1:4300/executive
```

### Manual Deployment Commands

Only deploy or restart when the user explicitly requests it.

ITASSET:

```bash
cd /home/telemed/it-asset-app-itservice
git pull
npm install
pm2 restart itasset --update-env
pm2 save
pm2 status
pm2 logs itasset --lines 100
```

Telemed Dashboard:

```bash
cd /home/telemed/TelemedDashboard
git pull
npm install
pm2 restart telemed-dashboard --update-env
pm2 save
pm2 status
pm2 logs telemed-dashboard --lines 100
```

## Git Safety

- Inspect `git status` before every commit or push.
- Stage explicit file paths. Do not use `git add .` without checking the exact file list.
- Never commit `.env`, `.env.save`, `data/users.json.bak.*`, `deploy/server-backup/`, database backups/dumps, logs, credentials, private keys, or configurations containing real passwords.
- If a sensitive file is untracked or staged, remove it from staging and add an appropriate `.gitignore` rule before committing.

## Telemed Data Safety

- HOSxP is read-only for this WebApp. Do not create tables or write service data.
- Permitted HOSxP operations are reporting reads only, such as `SELECT`, `SHOW`, and `DESCRIBE`.
- Do not modify `.env`, database settings, application logic, or server processes unless explicitly requested.

## Executive Department Target Interaction

- Route: `/executive?tab=department-target`; it reuses the already-loaded department target dataset for client-side filtering, room previews, and room detail dialogs. Do not add a HOSxP query for hover or local interaction.
- Actionable KPI cards and the sticky summary can filter the existing table to passed, failed, or data-check rows. The gap card opens a client-side breakdown of the current result set.
- Department target presentation states are distinct: `no_data` means OPD=0 and Telemed=0, `review` means OPD=0 and Telemed>0, `anomaly` means Telemed>OPD, and `valid` means the row can be evaluated normally.
- `no_data` rows are neutral and must not increase the review/anomaly count. Review/anomaly rows remain visible for audit but must not be treated as passing performance or appear in target-performance charts/highlights.
- Passed, near-target, and failed counts are derived from valid rows only. The target comparison chart uses valid rows; the gap chart and follow-up list use valid rows that remain below target.
- Room dialogs must remain keyboard accessible: focus moves into the dialog, `Escape` closes it, and focus returns to the originating control. Test the page at 1366x768 and 1920x1080 with browser zoom 100%.
- Keep the department-target action recommendation derived from the currently loaded rows: data-quality items first, then the largest actual deficit, then a near-target item, then the valid all-passed state. Do not add a query or infer an unverified cause.
- The `ข้อมูลควรตรวจสอบ` section separates review/anomaly rows from neutral no-data rooms. It is collapsible when either group contains rows and otherwise keeps a compact success state instead of an empty panel.
- Keep chart empty states compact and hide the canvas when no eligible rows exist; never leave an empty Chart.js axis occupying a full panel.
- The target total remains the sum of each room's `CEIL(OPD * 0.50)` target. Do not replace it with 50% of combined OPD without explicit approval.
- Respect `prefers-reduced-motion`: client-side scroll actions use non-animated scrolling and target-card, sticky-summary, and progress transitions are disabled. Test KPI actions, status chips, data-quality collapse, modal keyboard flow, and the sticky bar with 1366x768 and 1920x1080 at zoom 100%.
