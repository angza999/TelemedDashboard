# Database Schema Notes

## External Database
The app reads from the hospital HOSxP / HOSxP XE MySQL database. It does not manage HOSxP schema.

Connection config sources:
1. `.env`
2. `data/db-config.json` saved from Admin > Database Settings

Main database config code:
- `src/db.js`

## HOSxP Tables Used

### `ovst`
Main OPD visit table.

Fields used:
- `vn`: visit number, used as distinct visit id
- `vstdate`: visit date
- `ovstist`: visit status / service type key
- `main_dep`: main department code for department target report; matched against `opd_source_deps` and `telemed_count_deps` in `src/config/departmentTargets.js`

Note: If a HOSxP site uses `cur_dep` instead of `main_dep`, adjust the query field in `src/services/executiveService.js` while keeping the mapping in `src/config/departmentTargets.js`.

### `ovstist`
Visit status / service type table.

Fields used:
- `ovstist`: join key
- `name`: used to detect B2B text
- `export_code`: Telemed marker; `export_code = '5'`

### `opdscreen`
OPD screen table.

Fields used:
- `vn`: join key
- `cc`: chief complaint, used to detect B2B text

### `ovstdiag`
Diagnosis table.

Fields used:
- `vn`: join key
- `icd10`: ICD10 diagnosis code

DM logic:
- `LOWER(COALESCE(d.icd10, '')) LIKE 'e11%'`

HT logic:
- `LOWER(COALESCE(d.icd10, '')) LIKE 'i10%'`

### `kskdepartment`
Department table.

Fields used:
- `depcode`: department code
- `department`: department name

Note: The Executive `เป้าหมายรายห้อง` tab now uses `src/config/departmentTargets.js` for display names, service groups, OPD source departments, and Telemed source departments instead of joining every HOSxP department from `kskdepartment`.

## App Runtime Data Files

### `data/db-config.json`
Saved database connection config. Do not commit.

### `data/users.json`
Persistent app users. Do not commit.

Soft-deleted users stay in the file for auditability with:
- `deletedAt`: ISO datetime when the admin deleted the user
- `deletedBy`: admin username or id that performed the delete
- `isActive`: set to `false` when deleted

Deleted users are hidden from Admin > Users and cannot log in. User deletion affects only this WebApp data file and never touches HOSxP.

### `data/query-tool.log.jsonl`
Query Tool usage log. Do not commit.

### `data/dashboard-service-mapping.json`
Runtime WebApp storage for the "ผู้รับบริการวันนี้" dashboard mapping. Do not commit.

This is an application runtime file only:
- `card_key`: `OPD`, `NCD`, `ER`, or `IPD`
- `source_type`: `DEP` for OPD/NCD/ER, `WARD` for IPD
- `source_code`: HOSxP `kskdepartment.depcode` or `ward.ward`; always stored as a string so leading zeroes remain intact
- `display_name`: room or ward name for Admin UI
- `active`: `1` means included
- `sort_order`: display/save order

Important rule: this project must not create tables, alter tables, or write any configuration back into HOSxP. Mapping writes use this JSON-backed WebApp store only, and HOSxP remains read-only.
