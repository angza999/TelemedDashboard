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
- `main_dep`: main department code for department target report; matched against the configured Telemed room master list in `src/services/executiveService.js`

Note: If a HOSxP site uses `cur_dep` instead of `main_dep`, adjust `src/services/executiveService.js`.

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

Note: The Executive `เป้าหมายรายห้อง` tab now uses the configured Telemed room master list for display names and service groups instead of joining every HOSxP department from `kskdepartment`.

## App Runtime Data Files

### `data/db-config.json`
Saved database connection config. Do not commit.

### `data/users.json`
Persistent app users. Do not commit.

### `data/query-tool.log.jsonl`
Query Tool usage log. Do not commit.
