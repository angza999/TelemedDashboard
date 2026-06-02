# Future Features

## High Priority
- Add automated smoke test for login, role menus, Telemed page, Executive page.
- Add configurable department field for target tab: `main_dep` vs `cur_dep`.
- Add backup/export for `data/users.json` and `data/db-config.json`.
- Add production session store instead of MemoryStore.

## Reporting
- Add PDF export for department target tab.
- Add drill-down by month for department target report.
- Add target percentage setting instead of fixed 50%.
- Add department exclusions for rooms that should not be counted.

## Data Quality
- Add B2B keyword settings.
- Add alerts for missing ICD10, missing department, or missing `ovstist`.
- Add comparison page between dashboard totals and province SQL.

## Operations
- Add health check route.
- Add service log viewer for admin.
- Add deploy version/commit display in footer.

## Security
- Add password change for logged-in users.
- Add failed-login lockout by username.
- Add HTTPS reverse proxy guide.
- Add audit log for user management changes.

