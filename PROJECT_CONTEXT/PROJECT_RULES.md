# Project Rules

## Data Safety
- Never write to HOSxP clinical tables.
- HOSxP accepts reporting reads only: `SELECT`, `SHOW`, `DESCRIBE`, and `EXPLAIN SELECT`. The central guard must reject writes, DDL, administrative statements, multiple statements, and SELECT side effects.
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

## Executive Scope And Target Logic
- Hospital-wide Executive totals are distinct Telemedicine VN values and use the unit `ครั้ง`.
- Evaluable target totals include only `valid` department rows; `no_data`, `review`, and `anomaly` rows remain auditable but do not count as performance.
- Evaluable rate is `Telemed / OPD * 100` with a zero-denominator guard.
- Each room target uses its configured WebApp percentage and the existing `CEIL(OPD * percent)` rule.
- Total target is the sum of valid room targets. Total shortage is the sum of `max(room target - room Telemed, 0)` and must not be reduced by over-target rooms.
- Daily Executive charts use bars; monthly charts use lines. No-service calendar dates remain `null` and are excluded from active-service-day averages and low-day extrema.

## Access Control
- Hide menus by role and protect routes by role.
- `/telemed`: admin, executive, user
- `/executive`: admin, executive
- `/settings`: admin
- `/admin/query-tool`: admin
- `/admin/users`: admin
- `/admin/ncd-subclinics`: admin
- `/admin/ipd-subclinics`: admin

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
- Do not commit, push, deploy, or restart a server unless the user explicitly requests that operation.

## ER Subclinic Rules
- Support only `ฉีดยา/ทำแผล` and `ER Telemed` in this release.
- Use `ovst.main_dep`, `ovst.vstdate = CURDATE()`, and `COUNT(DISTINCT ovst.vn)`.
- Do not use `er_regist`, ICD-10, diagnoses, or `clinicmember`.
- Keep DEP codes as strings and never store mapping in HOSxP.
- `/admin/er-subclinics` and its mapping APIs are admin-only.
