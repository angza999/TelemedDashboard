# Project Rules

## Data Safety
- Never write to HOSxP clinical tables.
- Never add patient-level output unless the user explicitly requests it and privacy is reviewed.
- Exports should stay summary-level by default.

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

## Access Control
- Hide menus by role and protect routes by role.
- `/telemed`: admin, executive, user
- `/executive`: admin, executive
- `/settings`: admin
- `/admin/query-tool`: admin
- `/admin/users`: admin

## Code Style
- Keep changes scoped.
- Prefer existing patterns over new abstractions.
- Use shared services for shared calculations.
- Keep UI professional and hospital-friendly.

## Git And Deploy
- Commit only source/config-template/deploy docs.
- Do not commit `.env` or `data/`.
- After pushing, server can update with `git pull origin main`.

