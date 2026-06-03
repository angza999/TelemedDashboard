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
4. If target SQL mapping fails, overview still renders and target tab shows a mapping message.
5. Target tab shows Action Required, executive summary, overall target progress, KPI, Top 5 shortage rooms, compact charts, and a department table with `ผู้บริหาร` / `รายละเอียด` modes.

## Admin User Flow
1. Admin opens `/admin/users`.
2. Route reads users from `data/users.json`.
3. Admin can create/edit/reset/toggle.
4. Passwords are hashed.
5. Last active admin cannot be disabled or demoted.
