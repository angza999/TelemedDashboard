# Development Checklist

## Before Editing
- Run `git status --short`.
- Inspect existing route/service/view before changing behavior.
- Do not edit `data/` secrets or commit runtime files.
- Do not change Telemed counting logic unless the user asks directly.

## When Adding Backend Logic
- Use parameter binding for dates and user input.
- Keep HOSxP access read-only.
- Catch database mapping errors gracefully.
- Do not expose database password or raw connection details.

## When Adding UI
- Keep hospital dashboard style clean and professional.
- Use existing CSS in `public/css/app.css`.
- Use existing EJS layout and sidebar patterns.
- Ensure mobile tables use horizontal scroll.
- Do not show patient-level data unless explicitly approved.

## When Adding Export
- Use the same service data as the dashboard.
- Do not reimplement a different SQL formula in export routes.
- Excel/PDF should export summary data only.

## Tests To Run

```bash
node --check app.js
node --check src/routes/telemed.js
node --check src/routes/executive.js
node --check src/services/telemedService.js
node --check src/services/executiveService.js
node --check public/js/dashboard.js
node --check public/js/executive.js
```

Manual checks:
- Login admin and check all menus.
- Login executive and check Telemed + Executive only.
- Login user and check Telemed only.
- Test Telemed Dashboard filters.
- Test Excel/PDF exports.
- Test Query Tool SELECT and blocked DELETE/UPDATE.

## Server Update

```bash
cd /home/telemed/TelemedDashboard
git pull origin main
npm install --omit=dev
sudo systemctl restart telemed-dashboard
sudo systemctl status telemed-dashboard --no-pager
```

