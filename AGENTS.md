# Telemed Dashboard Agent Context

## Server / PM2 / Deployment Context

Server: `192.168.1.231`
Server user: `telemed`

Two independent applications run on the same server. Treat their project paths,
ports, and PM2 process names as separate deployment targets.

| Application | Project path | PM2 process | Port | URL |
| --- | --- | --- | --- | --- |
| ITASSET | `/home/telemed/it-asset-app-itservice` | `itasset` | `3000` | `http://192.168.1.231:3000` |
| Telemed Dashboard | `/home/telemed/TelemedDashboard` | `telemed-dashboard` | `4300` | `http://192.168.1.231:4300` |

### Critical Safety Rules

- Never use PM2 process `itasset` for Telemed Dashboard. It restarts the ITASSET application.
- Never use PM2 process `telemed-dashboard` for ITASSET.
- Do not restart, delete, stop, or kill a process until its PM2 `exec cwd` and port have been verified.
- ITASSET owns port `3000`; Telemed Dashboard owns port `4300`. Do not configure both applications on one port.
- For `EADDRINUSE`, identify the process and its project path first. Do not kill a process solely because it is listening on port `3000` or `4300`.

### Verify Before Any Deploy or Restart

Run these commands on the server before changing either application:

```bash
pm2 status
pm2 show itasset
pm2 show telemed-dashboard
sudo ss -ltnp | grep -E ':3000|:4300'
```

Expected PM2 working directories:

```text
itasset             -> /home/telemed/it-asset-app-itservice
telemed-dashboard   -> /home/telemed/TelemedDashboard
```

Health checks:

```bash
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1:4300/login
curl -I http://127.0.0.1:4300/executive
```

### Manual Deployment Commands

Only deploy or restart when the user explicitly requests it.

ITASSET:

```bash
cd /home/telemed/it-asset-app-itservice
git pull
npm install
pm2 restart itasset --update-env
pm2 save
pm2 status
pm2 logs itasset --lines 100
```

Telemed Dashboard:

```bash
cd /home/telemed/TelemedDashboard
git pull
npm install
pm2 restart telemed-dashboard --update-env
pm2 save
pm2 status
pm2 logs telemed-dashboard --lines 100
```

## Git Safety

- Inspect `git status` before every commit or push.
- Stage explicit file paths. Do not use `git add .` without checking the exact file list.
- Never commit `.env`, `.env.save`, `data/users.json.bak.*`, `deploy/server-backup/`, database backups/dumps, logs, credentials, private keys, or configurations containing real passwords.
- If a sensitive file is untracked or staged, remove it from staging and add an appropriate `.gitignore` rule before committing.

## Telemed Data Safety

- HOSxP is read-only for this WebApp. Do not create tables or write service data.
- Permitted HOSxP operations are reporting reads only, such as `SELECT`, `SHOW`, and `DESCRIBE`.
- Do not modify `.env`, database settings, application logic, or server processes unless explicitly requested.

## Executive Performance and HOSxP Read Diagnostics

- The Executive Dashboard is server-rendered with Express/EJS and plain browser JavaScript. It does not use React or React StrictMode.
- `/executive` has no polling or automatic refresh. A filter submission performs one document request; tab changes, loaded-row filters, previews, and dialogs remain client-side.
- One normal `/executive` page load performs three named HOSxP reporting reads in parallel: current overview, previous-period overview, and one batched department-target read. Do not restore one query per configured room.
- `/executive/department-target-data` and the department-target Excel export each use the same single batched target read. Executive PDF generation uses the same three shared services as the page.
- HOSxP read logs may include only aggregate diagnostics: command, safe query name, duration, row count, request ID, route, level, and UTC timestamp. Never log SQL text, bound parameters, credentials, HN, VN, or patient identifiers.
- `LOG_HOSXP_READS=true` enables verbose successful-read diagnostics. In production, fast successful reads are quiet by default; slow reads and errors remain visible. `HOSXP_SLOW_QUERY_MS` defaults to `1000` ms.
- `src/utils/requestContext.js` supplies per-request correlation and the `X-Request-ID` response header. Keep this context free of authentication details and patient data.
- MySQL pool diagnostics are internal-only and must not be exposed as a public endpoint. Do not increase `DB_CONNECTION_LIMIT` without measuring the server and HOSxP capacity.
- Performance checks against HOSxP must stay read-only and limited. Do not run production stress tests; use small DEV checks only and verify that all pool connections return to the free pool.

## Executive Department Target Interaction

- Route: `/executive?tab=department-target`; it reuses the already-loaded department target dataset for client-side filtering, room previews, and room detail dialogs. Do not add a HOSxP query for hover or local interaction.
- Actionable KPI cards and the sticky summary can filter the existing table to passed, failed, or data-check rows. The gap card opens a client-side breakdown of the current result set.
- Department target presentation states are distinct: `no_data` means OPD=0 and Telemed=0, `review` means OPD=0 and Telemed>0, `anomaly` means Telemed>OPD, and `valid` means the row can be evaluated normally.
- `no_data` rows are neutral and must not increase the review/anomaly count. Review/anomaly rows remain visible for audit but must not be treated as passing performance or appear in target-performance charts/highlights.
- Passed, near-target, and failed counts are derived from valid rows only. The target comparison chart uses valid rows; the gap chart and follow-up list use valid rows that remain below target.
- Room dialogs must remain keyboard accessible: focus moves into the dialog, `Escape` closes it, and focus returns to the originating control. Test the page at 1366x768 and 1920x1080 with browser zoom 100%.
- Keep the department-target action recommendation derived from the currently loaded rows: data-quality items first, then the largest actual deficit, then a near-target item, then the valid all-passed state. Do not add a query or infer an unverified cause.
- The `ข้อมูลควรตรวจสอบ` section separates review/anomaly rows from neutral no-data rooms. It is collapsible when either group contains rows and otherwise keeps a compact success state instead of an empty panel.
- Keep chart empty states compact and hide the canvas when no eligible rows exist; never leave an empty Chart.js axis occupying a full panel.
- The target total remains the sum of each room's `CEIL(OPD * 0.50)` target. Do not replace it with 50% of combined OPD without explicit approval.
- Respect `prefers-reduced-motion`: client-side scroll actions use non-animated scrolling and target-card, sticky-summary, and progress transitions are disabled. Test KPI actions, status chips, data-quality collapse, modal keyboard flow, and the sticky bar with 1366x768 and 1920x1080 at zoom 100%.
- Keep the department-target executive metric hierarchy compact: four primary metrics (OPD, Telemed achieved, summed room targets, and Telemed-to-OPD ratio), followed by one target-gap widget and one status widget.
- The target-gap progress is presentation-only and uses `telemed_total / target_50_total * 100`; cap only the visual bar at 100%, keep the displayed value truthful, and handle a zero target without division errors.
- Status widget actions must reuse the loaded table rows and existing client-side status filters. The `ดูทั้งหมด` action resets local table filters and scrolls to the existing table without requesting HOSxP again.
- Rank the Top 5 follow-up list from valid below-target rows only. Normalize each mini bar against the largest displayed gap, and do not include `no_data`, `review`, or `anomaly` rows in this performance ranking.
- Keep the `ต้องดำเนินการ` block as a compact insight strip. It should show the Telemed-to-OPD ratio, distance from the 50% target, and the existing data-derived recommendation; do not repeat the total shortage already shown in the gap widget.
- The status widget includes passed, near-target, failed, and data-check rows. Every enabled row must reuse the existing client-side table filters and must not trigger another HOSxP request.
- Present review/anomaly items as a clean divided list. Keep neutral no-data rooms in a separate disclosure that is collapsed by default, keyboard operable, and synchronized with `aria-expanded`.
- When table status chips are visible, keep the sticky summary compact by hiding its duplicate status actions and retaining only Telemed, target, and gap totals.
- Department-target final UI polish keeps the filter panel compact, the action-required strip to one evidence-based recommendation, Top 5 as a ranked valid-below-target list, and review/anomaly rows as a divided audit list. These are presentation-only changes: do not alter the loaded dataset, formulas, SQL, API, or HOSxP access to adjust this layout.

## Executive Overview Metric Semantics

### Executive Presentation Scope

- Keep the Executive overview's hospital-wide Telemedicine total separate from the department-target evaluation scope. The hospital total is the canonical distinct Telemed VN set; OPD, achieved Telemedicine, target, rate, and gap in the target-progress panel use valid department-target rows only.
- The overview shows four compact KPI cards: evaluable OPD, achieved Telemedicine, Telemedicine-to-OPD ratio, and separately scoped hospital-wide Telemedicine. The summed room target and positive shortage remain together in the target-progress panel and must never be mixed into an evaluable-room denominator.
- The summed target remains `SUM(CEIL(room OPD * configured target percent))`. The displayed shortage is the sum of individual positive room shortages; an over-target room must not offset another room's shortfall.
- Overview filters may group the already-loaded current-period rows by day, week, or month. Weekly grouping starts on Monday and is presentation-only; it must not add or alter a HOSxP query.
- The department-target room search and status filtering are client-side interactions on the already-loaded result set. Keep the mobile table as stacked readable rows rather than introducing a second scroll container.

- Route `/executive?tab=overview` uses `src/services/executiveOverviewService.js` as its canonical aggregate source. Keep `/telemed` on its existing province-query logic unless explicitly approved.
- Keep the Executive overview presentation order stable: compact filter with a Thai date-range context line, four scoped KPI cards (`OPD ห้องที่ประเมิน`, `Telemedicine ที่ใช้ประเมิน`, `สัดส่วน Telemedicine ต่อ OPD`, and `Telemedicine ทั้งโรงพยาบาล`), the per-room target-progress panel, a trend and Top 5 follow-up decision grid, a three-line Executive Insight, collapsed additional information, and aggregate data quality.
- Use `ห้องที่ประเมิน` consistently for the valid department-target scope; state that the room has data ready for evaluation when more context is needed, while keeping it distinct from the hospital-wide Telemedicine total.
- The per-room target-progress panel contains the summed room target, achieved Telemedicine, positive shortage, and achieved-to-target progress. It is not a hospital-wide KPI and must remain visibly scoped to valid evaluable rooms.
- Hide overview KPIs, Top 5, and charts when the current-period total is empty or the database request fails. Use compact empty/error states and a retry link; while a filter request is navigating, show a restrained skeleton and set `aria-busy` without inventing zero values.
- Keep the Executive support strip as an eight-item 4x2 grid on desktop inside the collapsed `ข้อมูลเพิ่มเติม` disclosure: active-day average, DM, HT, B2C, highest service day, lowest service day, B2B, and aggregate data quality. DM/HT overlap and room reconciliation belong in that disclosure.
- Keep hospital-wide and evaluable-room scopes separate. Hospital-wide Telemedicine is the canonical distinct-VN set; evaluable OPD, evaluable Telemedicine, target, rate, and shortage use only valid department-target rows. Never combine one scope's numerator with the other scope's denominator.
- Evaluable rate is `sum(valid room Telemed) / sum(valid room OPD) * 100`. The total room target is the sum of each valid room's configured, rounded-up target. Total shortage is `sum(max(room target - room Telemed, 0))`; an over-target room must never offset another room's shortage. Retain the net difference separately for audit only.
- The executive overview grain is one row per distinct Telemed `VN` where `ovstist.export_code = '5'`. Present this measure as `ครั้งรับบริการ Telemed`; do not describe it as unique patients.
- DM is a distinct Telemed VN with ICD10 `E11%`; HT is a distinct Telemed VN with ICD10 `I10%`. One VN may count in both DM and HT, so always retain and expose the DM/HT overlap.
- Channel and disease are separate dimensions. B2B requires an explicit `b2b` marker and B2C requires an explicit `b2c` marker in `ovstist.name` or `opdscreen.cc`. Visits with neither marker are `unclassified`; visits with both markers are `conflict`.
- Never derive executive B2C as `DM B2C + HT B2C` or as `NOT B2B`. Show B2B/B2C percentages or the B2C 50% target only when channel coverage is complete; otherwise surface unclassified/conflict counts.
- Executive daily average means `distinct Telemed VN / active service days`. Also expose calendar days so the denominator is auditable. Previous-period comparison uses the immediately preceding date range with the same inclusive day count.
- Top-room totals use one `main_dep` room per canonical VN. Top 5, other rooms, and room reconciliation must use the same current-period visit set as the overview KPIs.
- Keep aggregate diagnostics free of patient identifiers. `DEBUG_EXECUTIVE_DATA=true` may log only aggregate reconciliation fields; never log VN, HN, names, or connection credentials.
- A unique-patient count may be derived in memory from HN for diagnostics, but only the aggregate count may leave the service. Never expose, serialize, or log individual HN/VN values.
- Required reconciliation checks are: channel partition equals total VN, room totals equal total VN, DM/HT overlap remains explicit, and averages do not produce `NaN` or `Infinity`.
- `otherDiseaseVisits` means canonical Telemed VNs that match neither DM (`E11%`) nor HT (`I10%`). Keep the disease reconciliation explicit: DM-only + HT-only + DM/HT overlap + other = total Telemed VN.
- A complete channel partition may truthfully contain B2B=0. In that state say no B2B service was found and show that channel data is complete; do not imply missing data. The B2C target comes from `EXECUTIVE_B2C_TARGET_PERCENT` (default 50%) and uses classified-channel visits as its denominator.
- Daily overview extremes use active service days only and retain every tied highest or lowest date. Calendar dates without service remain in the daily chart timeline as `null`, not zero, and Chart.js must keep `spanGaps: false`.
- Use bars for the daily Executive trend and a line for the monthly trend. Highlight at most one highest period, keep the lowest period neutral, cap animation at 300 ms, and disable it for reduced-motion users. The trend sum must reconcile to the hospital-wide Telemedicine KPI.
- Executive overview Top 5 rooms use the single `ovst.main_dep` value on each canonical VN and reconcile classified rooms separately from missing `main_dep`. Do not reuse `departmentTargets` source-room mappings for this ranking. Refer to these as main service rooms because the available evidence does not prove the physical Telemed endpoint.
- The trend average and KPI average must both use total distinct Telemed VN divided by active service days. A no-service calendar day has no visit value and must not lower the active-day average.
- Run `npm test` after changing executive overview semantics. The fixture suite covers DM-only, HT-only, overlap, other disease, complete B2B-zero/B2C-total, unclassified, conflict, tied extremes, timeline gaps, empty periods, room evidence, room reconciliation, previous periods, and read-only query safety.
- Keep the Telemed visit series discontinuous across no-service dates (`null`, `spanGaps: false`), but render the average line continuously by repeating the canonical `averagePerServiceDay` across every calendar date. The average dataset is presentation-only and must not redefine the KPI denominator.
- Use `src/utils/thaiDate.js` for Thai executive date, month, range, and tied-date list labels. Date inputs may remain browser-native ISO values, but summary copy, chart tooltips, period labels, tied-extreme labels, and executive PDF headings must use the shared Thai helpers.
- Treat `metrics.extremes.highest` and `metrics.extremes.lowest` as the shared source for KPI labels and chart highlights. Both retain all tied active-service dates; never include no-service calendar gaps as a zero-valued minimum.
- Top 5 room coverage is `topFiveTelemedTotal + otherTelemedTotal + roomUnclassifiedTotal = total Telemed`. Missing `main_dep` stays in the explicit unclassified-room bucket and must not be folded into `other` without disclosure.
- Show the B2C target badge only when channel data is complete. Its configurable threshold is `EXECUTIVE_B2C_TARGET_PERCENT` (default 50%) and its denominator is classified Telemed channel visits, never the OPD department-target formula.
- `test/executiveOverviewService.test.js` also guards continuous average presentation, Thai Buddhist-date formatting (including year crossings), tied extremes, channel target readiness, and read-only query safety.
- Run `npm test` plus JavaScript syntax and EJS compile checks after changing Executive metrics, target summaries, charts, or exports. The governance suite also protects valid-row aggregation and non-offset room-shortage totals.
- Executive overview date controls must show `DD Thai-short-month Buddhist-year` labels while retaining ISO `YYYY-MM-DD` values for requests. Parse ISO date-only values without local-time conversion and reuse `src/utils/thaiDate.js` for server-rendered labels.
- Present achieved-to-target progress as `sum(valid room Telemed) / sum(valid room target) * 100`. The bar uses teal for achieved progress and a neutral remainder, clamps only its visual width to 100%, and keeps the truthful value in text and ARIA attributes.
- Keep the overview follow-up list to at most five valid below-target rooms. Use a compact three-part row (room and gap, achieved/target context, progress), avoid a wide comparison table, and show a native tooltip only when a room label is actually truncated.
- Keep the hospital trend color semantically stable: all service bars/points use teal and the single highest period is identified by a text label and tooltip, not by an unexplained orange bar.
- Keep `สรุปเพื่อการตัดสินใจ` to two concise lines: achieved-to-target progress and shortage first, then at most two priority rooms. `ข้อมูลเพิ่มเติม` remains collapsed by default with synchronized `aria-expanded`.
- Executive data-quality messaging must remain aggregate, actionable, and free of patient identifiers. Show affected categories and impact counts; reserve technical details for admin users.
