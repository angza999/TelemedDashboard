# Telemed Logic

## Core Definition
Telemed visit:

```sql
ovstist.export_code = '5'
```

## Category Logic

### B2B

```sql
LOWER(COALESCE(ovstist.name, '')) LIKE '%b2b%'
OR LOWER(COALESCE(opdscreen.cc, '')) LIKE '%b2b%'
```

### B2C
Not B2B.

### DM

```sql
LOWER(COALESCE(ovstdiag.icd10, '')) LIKE 'e11%'
```

### HT

```sql
LOWER(COALESCE(ovstdiag.icd10, '')) LIKE 'i10%'
```

## Counting Rule
Use `COUNT(DISTINCT vn)`.

One visit can be counted in both DM and HT if it has both E11 and I10 diagnoses. Do not force a visit into only one disease group.

## Output Fields
Daily/monthly summary should provide:
- `vstdate` or `period`
- `dm_b2b`
- `dm_b2c`
- `ht_b2b`
- `ht_b2c`
- `dm_total`
- `ht_total`
- `b2b_total`
- `b2c_total`
- `total`

## Summary Rule
Top KPI summary should be calculated from returned rows:
- `total = sum(total)`
- `dm_total = dm_b2b + dm_b2c`
- `ht_total = ht_b2b + ht_b2c`
- `b2b_total = dm_b2b + ht_b2b`
- `b2c_total = dm_b2c + ht_b2c`

## Important Note
`Total` is all Telemed visits. DM/HT are visits with ICD10 E11/I10. Therefore `Total` may not equal `DM total + HT total`.

Executive overview trend line labeled `Total Telemed` must use this actual `total` field. Do not calculate it from `DM B2B + DM B2C + HT B2B + HT B2C`.

## Department Target Logic
Used in Executive Dashboard tab `เป้าหมายรายห้อง`.

- Rows are generated from the configured mapping in `src/config/departmentTargets.js`, not from whatever department rows happen to appear in SQL.
- OPD total = distinct `ovst.vn` where `ovst.main_dep IN opd_source_deps`
- Telemed total = distinct `ovst.vn` where `ovst.main_dep IN telemed_count_deps`, `ovstist.export_code = '5'`, and mode-specific B2B/B2C condition passes
- Target 50% = `CEIL(opd_total * 0.5)`
- Percent = `telemed_total / opd_total * 100`
- Difference = `telemed_total - target_50`
- Passed if `telemed_total >= target_50`

### Department Target Mapping
The `เป้าหมายรายห้อง` tab is limited to the hospital Telemed room reference list configured in `src/config/departmentTargets.js`.

Columns:
- `display_depcode`: report row code shown in the dashboard
- `display_name`: report row name shown in the dashboard
- `service_group`: reporting group used for audit context
- `opd_source_deps`: HOSxP `ovst.main_dep` values used to count OPD total
- `telemed_count_deps`: HOSxP `ovst.main_dep` values used to count Telemed achieved
- `telemed_mode`: `B2C_ONLY` or `B2B_ONLY`
- `note`: optional explanation shown in tooltip/export

Implementation note: SQL sends only depcode lists to MySQL and maps Thai display names/service groups in Node.js after the query returns, because some HOSxP/MySQL connections can garble Thai text sent as query parameters.

Mode rules:
- `B2C_ONLY`: Telemed achieved = B2C Telemed only. `b2b_total = 0`, `b2c_total = telemed_total`.
- `B2B_ONLY`: Telemed achieved = B2B Telemed only. `b2b_total = telemed_total`, `b2c_total = 0`.

Excel export must use the same `fetchDepartmentTargetData()` service model as the dashboard so values match the web table.

Configured rows:
- `080` OPD Telemed: OPD `111`, Telemed `111,080`, `B2C_ONLY`
- `082` ER Telemed: OPD `004`, Telemed `004,082`, `B2C_ONLY`
- `066` NCD Telemed: OPD `014`, Telemed `014,066`, `B2C_ONLY`
- `085` NCDCSG Telemed: OPD `055`, Telemed `055,085`, `B2C_ONLY`
- `077` คลินิกความดัน-Telemed: OPD `015`, Telemed `015,077,075`, `B2C_ONLY`
- `084` จิตเวช Telemed: OPD `052`, Telemed `052,084`, `B2C_ONLY`
- `083` ทันตกรรม Telemed: OPD `005`, Telemed `005,083`, `B2C_ONLY`
- `081` ห้องจ่ายยา Telemed: OPD `012,070`, Telemed `012,070,081`, `B2C_ONLY`
- `037` กายภาพบำบัด: OPD `037`, Telemed `037`, `B2C_ONLY`
- `078` กายภาพบำบัด(รองเท้ารองช้ำ): OPD `078`, Telemed `078`, `B2C_ONLY`
- `004` อุบัติเหตุ - ฉุกเฉิน: OPD `004`, Telemed `004,082`, `B2C_ONLY`
- `007` งานแพทย์แผนไทย: OPD `007`, Telemed `007`, `B2C_ONLY`
- `079` PHDTelemed: OPD `079`, Telemed `079`, `B2C_ONLY`
- `086` B2B Telemed: OPD `086`, Telemed `086`, `B2B_ONLY`
