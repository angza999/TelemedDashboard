# Project Rules

## Data Safety
- Never write to HOSxP clinical tables.
- Never add patient-level output unless the user explicitly requests it and privacy is reviewed.
- Exports should stay summary-level by default.
- Query Tool exports may include patient-level data if admin queries it; show privacy warnings when sensitive column names are detected.

## SQL Safety
- Use parameter binding for dates and user input.
- Avoid string concatenation for SQL values.
- Dashboard SQL must use `COUNT(DISTINCT vn)` to prevent duplicate visits from multiple diagnosis rows.
- Query Tool must remain SELECT-only and admin-only.

## Telemed Logic
Do not change the province-aligned formula without explicit instruction:
- `ovstist.export_code = '5'`
- ICD10 `E11%` for DM
- ICD10 `I10%` for HT
- B2B if `ovstist.name` or `opdscreen.cc` contains `b2b`
- Executive trend `Total Telemed` must use the actual `total` field, not `DM + HT`, because some Telemed visits may not have ICD10 E11/I10.

## Access Control
- Hide menus by role and protect routes by role.
- `/telemed`: admin, executive, user
- `/executive`: admin, executive
- `/settings`: admin
- `/admin/query-tool`: admin
- `/admin/users`: admin
- `/admin/ncd-subclinics`: admin

## Code Style
- Keep changes scoped.
- Prefer existing patterns over new abstractions.
- Use shared services for shared calculations.
- Keep UI professional and hospital-friendly.
- Update the relevant `PROJECT_CONTEXT/*.md` file every time the project is changed.

## Git And Deploy
- Commit only source/config-template/deploy docs.
- Do not commit `.env` or `data/`.
- After pushing, server can update with `git pull origin main`.
