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
- Executive hospital-wide summary: `src/services/executiveOverviewService.js`
- Executive department target: `src/services/executiveService.js`
- Exports: `src/services/reportExportService.js`

Avoid duplicate SQL with different formulas.

## Executive Metric Scopes
- Hospital-wide Telemedicine is one distinct Telemedicine VN and is shown as `ครั้ง`.
- Department-target performance is a separate evaluable-room scope. OPD, Telemedicine, rate, target, and shortage include valid target rows only.
- Room target rounding remains `CEIL` per room. Aggregate target is the sum of rounded room targets.
- Aggregate shortage is the sum of positive room shortfalls, not the net difference between all Telemedicine and all targets. Excess rooms cannot mask rooms that remain below target.
- No-service calendar dates are `null`; active-service-day averages and extrema never treat those dates as zero.

## Executive Overview Presentation Decisions
- Visible date labels use Thai Buddhist dates, while filters continue to submit ISO date-only values.
- Achieved-to-target progress is presentation-only and uses evaluated Telemedicine divided by the summed per-room target. Clamp only the visual bar, never the displayed value.
- Follow-up ranking is limited to five valid below-target rooms and must remain a compact responsive list.
- The hospital trend uses a consistent teal series; the highest period is identified by explicit text and tooltip evidence.
- Additional information is collapsed by default, and data-quality messaging remains aggregate and free of patient identifiers.

## Role Policy
- `admin`: all pages and functions
- `executive`: Telemed Dashboard and Executive Dashboard only
- `user`: Telemed Dashboard only

Menu hiding is not enough. Routes must also be protected.

## Query Tool Safety
Query Tool is admin-only and SELECT-only. It blocks dangerous keywords and wraps queries with `LIMIT 1000`.

## LAN HTTP Deployment
The server currently runs over HTTP on LAN. HSTS and HTTPS upgrade are disabled by default to avoid browser protocol errors on `192.168.1.231:4300`.
