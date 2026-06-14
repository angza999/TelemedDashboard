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

- OPD total = distinct `ovst.vn` by department
- Telemed total = distinct `ovst.vn` with `ovstist.export_code = '5'`
- Target 50% = `CEIL(opd_total * 0.5)`
- Percent = `telemed_total / opd_total * 100`
- Difference = `telemed_total - target_50`
- Passed if `telemed_total >= target_50`

### Department Target Master List
The `เป้าหมายรายห้อง` tab is limited to the hospital Telemed room reference list configured in `src/services/executiveService.js`.

Columns:
- `depcode`: HOSxP `ovst.main_dep` department code
- `department`: display name used in the dashboard
- `service_group`: reporting group used for audit context

Configured rows:
- `086` B2B Telemed / Telemed
- `082` ER Telemed / Telemed
- `066` NCD Telemed / Telemed
- `085` NCDCSG Telemed / Telemed
- `080` OPD Telemed / Telemed
- `079` PHDTelemed / Telemed
- `077` คลินิกความดัน-Telemed / Telemed
- `084` จิตเวช Telemed / Telemed
- `083` ทันตกรรม Telemed / Telemed
- `081` ห้องจ่ายยา Telemed / Telemed
- `037` กายภาพบำบัด / กายภาพ
- `078` กายภาพบำบัด(รองเท้ารองช้ำ) / กายภาพ
- `004` อุบัติเหตุ - ฉุกเฉิน / อุบัติเหตุฉุกเฉิน
- `007` งานแพทย์แผนไทย / แผนไทย
