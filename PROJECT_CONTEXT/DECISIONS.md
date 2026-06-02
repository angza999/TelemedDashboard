# Technical Decisions

## Read-only Dashboard
This project is a reporting dashboard, not a data-entry system. Code must not write to HOSxP tables.

## Province Query Logic
Telemed counting logic was aligned to the province query:
- Telemed = `ovstist.export_code = '5'`
- DM = ICD10 `E11%`
- HT = ICD10 `I10%`
- B2B = `ovstist.name` or `opdscreen.cc` contains `b2b`
- B2C = not B2B
- Count with `COUNT(DISTINCT vn)`

Do not change this logic unless explicitly requested.

## Shared Service First
Dashboard, API, Excel, and PDF should use shared services:
- Telemed summary: `src/services/telemedService.js`
- Executive department target: `src/services/executiveService.js`
- Exports: `src/services/reportExportService.js`

Avoid duplicate SQL with different formulas.

## Role Policy
- `admin`: all pages and functions
- `executive`: Telemed Dashboard and Executive Dashboard only
- `user`: Telemed Dashboard only

Menu hiding is not enough. Routes must also be protected.

## Query Tool Safety
Query Tool is admin-only and SELECT-only. It blocks dangerous keywords and wraps queries with `LIMIT 1000`.

## LAN HTTP Deployment
The server currently runs over HTTP on LAN. HSTS and HTTPS upgrade are disabled by default to avoid browser protocol errors on `192.168.1.231:4300`.

