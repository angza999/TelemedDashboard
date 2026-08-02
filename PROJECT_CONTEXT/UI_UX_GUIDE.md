# UI / UX Guide

## Visual Tone
- Hospital dashboard
- Clean, professional, calm
- Focus on readable numbers and quick scanning
- Avoid decorative clutter
- Use plain action-oriented Thai labels in executive charts, such as `จำนวน Telemed ที่ทำได้`, instead of ambiguous shorthand.

## Layout Rules
- Sidebar is role-aware.
- Admin sidebar items should stay grouped as collapsible `ระบบ` and `Dashboard` sections. Keep labels short, indent children, and open the group that contains the active route.
- Main content uses panels, KPI cards, charts, and responsive tables.
- Keep operational pages dense but readable.
- Keep executive pages simpler and more summary-focused.
- Executive target charts should stack as full-width panels when labels are long or datasets are dense.
- For Chart.js horizontal bar charts, control height through the chart wrapper, not a fixed `<canvas height="">` attribute.
- For Executive target charts, avoid `height: 100% !important` on canvas and prefer explicit JS sizing when Chart.js auto-responsive behavior stretches the page.
- For Executive target Chart.js canvases, wait for fonts and visible container layout before rendering, set a clear `devicePixelRatio`, and resize/update after tab or chart-limit changes to keep labels sharp.
- Set a max bar thickness for horizontal bars so a single row or small dataset does not become an oversized block.
- In the Executive department target tab, order content for quick action: Action Required, executive summary, overall target progress, KPI cards, Top 5 shortage rooms, compact charts, then the full table.
- Keep department target charts focused on Top 10 by default. Top 20/all are optional views for deeper inspection.
- Prefer target-gap charts over percent-only charts when most departments are far below target; executives need to see how many visits must be added.
- In the Executive department target tab, use `จำนวน Telemed ที่ทำได้` for visible Telemed count labels. Reserve `สัดส่วน Telemed ต่อ OPD` for `telemed_total / opd_total * 100`, and `ความคืบหน้าสู่เป้าหมาย` for `telemed_total / target_50_total * 100`.
- In the Executive department target tab, keep four presentation states distinct: OPD=0/Telemed=0 is neutral `ไม่มีข้อมูล`, OPD=0/Telemed>0 is `ตรวจสอบข้อมูล`, Telemed>OPD is `ตรวจสอบข้อมูล`, and normal rows are eligible for target evaluation.
- Do not include `ไม่มีข้อมูล` or `ตรวจสอบข้อมูล` rows in passed/near/failed counts, performance highlights, follow-up rankings, or target charts. Keep both groups visible for audit, with neutral styling for no-data rooms.
- Use six to eight primary KPIs at most on the department target tab. Use a four-column desktop grid so a seven-card set remains balanced, show the Top 5 shortage rooms as a compact ranked list, keep charts side by side on desktop, and default long tables to Top 10 with room search and an explicit `ดูทั้งหมด` control. Right-align numeric table fields for easier comparison.
- Department target action KPIs may be interactive only when they lead to a clear local action: passed/failed filters the already-loaded table, data-check navigates to the review list, and total gap opens a derived breakdown. Keep all other KPIs informational.
- Put compact status chips before the department target table. Filtering must be client-side, keyboard accessible, visibly active, and paired with a clear-filter control when a local filter is active.
- Use a compact sticky department-target summary only after the main KPI group has left the viewport. It must stay clear of the sidebar, expose the key gap and room statuses, and not add a second navigation layer.
- Room hover previews must use the already-loaded target row, stay compact, and fall back to the room detail dialog on touch devices.
- Use risk labels for target rows: shortage over 500 is `เร่งด่วนมาก`, 200-499 is `เร่งด่วน`, and 1-199 is `ควรติดตาม`; preserve `ใกล้ถึงเป้า`, `ผ่านเป้า`, and `ตรวจสอบข้อมูล` for their corresponding states. Present recommendations in plain Thai and keep source/mapping information inside the admin-only part of the room detail modal.
- Department target chart tooltips should show room, service group, OPD total, Telemed achieved, 50% target, Telemed-to-OPD percent, and the gap wording (`ต้องเพิ่ม`, `เกินเป้า`, or `ถึงเป้า`).
- Service-group quick filters should update the whole department target tab, including KPI cards, summaries, charts, table, and Excel export.
- The `/today-patients` page should read as a compact executive dashboard: status/date/last-updated on the left where space allows, manual refresh button and helper text grouped on the right, and four equal-height cards with large baseline-aligned numbers plus `คน` units.
- The `/today-patients` NCD subclinic modal should read as a small dashboard: show main NCD, total subclinics, and ungrouped/mapping gap before the subclinic cards; use clear status copy for not configured, configured with no patients today, and active patient counts; use soft distinct visual themes for HT, DM, COPD, and CKD; and keep the admin settings action visible only for admin users.
- The `/today-patients` IPD subclinic modal should mirror the NCD modal pattern: show main IPD, total subclinics, and ungrouped/mapping gap before the subclinic cards; use clear status copy for missing Ward mapping, configured Ward with no active admissions, and active inpatient counts; keep `หอผู้ป่วยรวม` and `Homeward` visually distinct; and keep the admin settings action visible only for admin users.
- The `/telemed` DM/HT dashboard should use an executive-first hierarchy: primary KPI cards are Total Telemed, DM, HT, B2B, and B2C; the four disease/channel combinations are a secondary detail row. Keep the source/query name visible but subdued, and keep B2B data-quality troubleshooting language technical only for admins.
- Telemed charts should use soft grid lines, readable tooltips, an empty state, and a donut centre label with the dominant B2B/B2C share plus total count. Hide all-zero B2B trend series to reduce visual noise without changing table data.
- For `/telemed`, show a chart empty state only when every visible trend series is zero. If B2C data exists while B2B is zero, keep both charts visible, show the B2C share in the donut centre, and use a small B2B data-quality note rather than an empty overlay.
- Let the Telemed summary table use normal page scrolling; retain horizontal scrolling only for narrow screens and wide columns so users do not have to navigate nested vertical scroll areas.
- In Telemed summary tables, label the overall visit count as `Telemed ทั้งหมด` rather than the ambiguous `Total`; DM/HT/B2B/B2C remain supporting breakdowns.

## Colors
Current style uses:
- Primary teal/green for main actions
- Blue for B2B
- Amber/orange for warnings and B2C
- Green/yellow/orange status badges
- Light gray/blue backgrounds

## Tables
- Use horizontal scroll for wide tables.
- Add total rows for summary tables.
- Use status badges instead of raw text when possible.
- Do not make tables too dense for executive views.
- Use progress bars for executive target percentages when quick scanning matters.
- For executive target tables, default to a `ผู้บริหาร` summary view and provide a `รายละเอียด` view for audit columns such as depcode, B2B, B2C, and target count.
- In executive target tables, emphasize the gap/status cells more than painting every failed row strongly.
- Executive department target table statuses should stay short: `ผ่าน`, `ใกล้ถึง`, and `ไม่ผ่าน`, with a small legend explaining the thresholds.

## Buttons
- Primary button for main action.
- Secondary button for export or alternative action.
- Icon buttons for logout/action shortcuts.

## Alerts
- Database or SQL mapping errors should be readable and not expose passwords.
- B2B zero alerts should be warning tone, not alarmist.
- For executive pages, B2B zero should be a data-quality note unless it blocks interpretation.
- Empty data should clearly say no Telemed data in selected range.

## Mobile
- KPI cards should stack.
- Filter forms should become single column.
- Wide tables should scroll horizontally, not shrink into unreadable columns.

## Telemed Dashboard
- Use one dashboard response snapshot to render KPI cards, category details, charts, donut, table, query metadata, and export links together.
- Keep the HOSxP source strip, status message, warning, and filter controls compact enough that notebook users can reach analytical content quickly.
- Show `ยังไม่พบรายการ B2B ในช่วงวันที่เลือก` as the primary B2B warning for all roles.
- Show the technical B2B source-field hint only to admin users and keep it visually subordinate.
- When the top B2B warning is visible, use only short supporting notes near charts, such as `B2B: 0 ราย` or `ยังไม่พบรายการ B2B`.

## Executive Dashboard
- Present the Executive overview with four compact scoped cards: `OPD ห้องที่ประเมิน`, `Telemedicine ที่ใช้ประเมิน`, `สัดส่วน Telemedicine ต่อ OPD`, and `Telemedicine ทั้งโรงพยาบาล`. Keep target, shortage, and achieved-to-target progress together in the following target-progress panel rather than presenting them as competing KPI cards.
- Place one target-progress panel immediately below the KPI group. It shows actual, target, positive room shortage, and actual-to-target progress without repeating the same total in adjacent cards.
- Keep Executive filters compact and allow daily, weekly, or monthly display grouping. Date inputs retain browser-native ISO values for safe submission, while the visible period context, tooltips, charts, and PDF use the shared Thai date helpers. Weekly is a Monday-start presentation grouping; label its trend and chart tooltip as weekly rather than daily.
- For department targets, retain filters at the top, include one room-name search field there, and use `ห้องบริการ` plus `ร้อยละ Telemedicine ต่อ OPD` in the executive table. On mobile, present rows as readable stacked fields and avoid nested scrolling.
- Order the overview for rapid scanning: compact filters with a Thai date context, the four scoped KPI cards, one per-room target-progress panel, a trend and Top 5 follow-up decision grid, a three-line Executive Insight, collapsed supporting details, and aggregate data quality. The insight may wrap compactly on mobile.
- Use `ห้องที่ประเมิน` consistently. Never combine the hospital-wide distinct-VN total with the evaluable-room OPD denominator or room target formula.
- Present the Top 5 as `5 ห้องที่ควรเร่งติดตาม`; each compact desktop row shows rank, room, achieved, target, gap, progress, and status with thin separators. On mobile, the same evidence is stacked into labelled fields without an internal scrollbar.
- Use `แนวโน้มบริการ Telemedicine รายวัน` for the daily chart and the monthly equivalent when grouped by month. Preserve daily null gaps, use short Thai date labels, and keep the average line visibly distinct.
- Use an eight-item desktop support grid inside the collapsed `ข้อมูลเพิ่มเติม` disclosure: active-day average, DM, HT, B2C, highest service day, lowest service day, B2B, and aggregate quality. Move DM/HT overlap and room reconciliation to the same disclosure.
- On filter submission, show a restrained loading skeleton and `aria-busy`. If the period is empty or the database fails, hide KPI/Top 5/chart content and use a compact empty/error state with retry guidance rather than displaying fabricated zeros.
- The four scoped KPI cards and target-progress panel must distinguish the hospital-wide distinct-VN total from evaluable-room OPD, evaluable Telemedicine, evaluable rate, summed target, and non-offset room shortage. Use `ครั้ง` for every distinct-VN visit count.
- Explain that the previous-period comparison uses the immediately preceding date range with the same number of days.
- If the minimum-service day is the selected range's final day, keep the value but add a restrained note that the day's data may still be incomplete.
- Keep ICD-code and other technical metric hints visible only to admins; executive users should see plain-language labels.
- Use Thai metric labels and `ครั้ง` for distinct-VN Telemed and OPD visit counts. Reserve `ราย` or `คน` for true unique-person counts such as distinct HN.
- Show comparison with the immediately preceding period and keep the zero-denominator state explicit instead of displaying a misleading percentage.
- The hospital-wide trend uses daily bars and a monthly line. It shows a subdued continuous active-day average, highlights at most one peak, keeps low values neutral, uses Thai tooltips, and preserves no-service dates as gaps.
- Keep the B2B/B2C donut compact with a center value. If B2B is zero but B2C exists, show B2C 100% and the real total rather than an empty state.
- Prefer compact HTML comparison bars for DM/HT when a large chart adds little decision value.
- Store adjustable executive targets in WebApp configuration only. Never write dashboard targets or settings to HOSxP.
- PDF export should expose a visible generating/success/error state and prevent duplicate clicks while the same export is running.
- The `/executive?tab=department-target` action summary should include one short, evidence-based recommendation from the active result set. Prioritize data-quality review, then the largest remaining target gap, then near-target follow-up, and finally the all-passed state. Do not speculate about a clinical or workflow cause.
- For department targets, always show a compact `ใกล้ถึงเป้า` or no-near-target state and a `ข้อมูลควรตรวจสอบ` or no-anomaly state; empty panels make the executive workflow ambiguous. Keep anomaly rows out of performance charts and pass/fail highlights.
- When no eligible department rows exist, replace the chart canvas with a compact explanation instead of leaving empty axes. If the gap chart has no below-target room, show the compact all-clear state in the existing chart panel.
- Formula information icons must provide a title and keyboard-accessible label. Target total must state that it is the sum of each room's rounded 50% target, so it can differ slightly from 50% of combined OPD.
- Prefer restrained motion: card hover lift, progress/sticky transitions, and dialogs may animate subtly, but all of them must honor `prefers-reduced-motion`.
- In the department-target summary, use four primary metric cards for OPD, Telemed achieved, summed 50% targets, and Telemed-to-OPD ratio. Keep gap and status as separate executive widgets so actions are clear without creating nested card layouts.
- The target-gap widget may show Telemed progress toward the summed room target. Cap its visual fill at 100% while retaining the actual displayed percentage and a safe zero-target state.
- Present the Top 5 follow-up rooms as a compact ranked list. Each row should show rank, room name, normalized shortage bar, shortage count, and risk badge; the list must use valid below-target rows only.
- The Top 5 `ดูทั้งหมด` control should reset client-side table filters and move focus toward the existing audit table. It must not trigger another database request.
- Keep `ต้องดำเนินการ` as an insight strip rather than a duplicate KPI: show Telemed-to-OPD performance, the point difference from the 50% target, and one evidence-based recommendation. Leave the shortage total to the gap widget.
- Include `ใกล้ถึงเป้า` in the compact status widget when the existing near-target count is available. A zero count remains visible but disabled; an enabled row filters the loaded table locally.
- Show review/anomaly rows as a divided review list without nested cards. Put neutral no-data rooms in a separate gray disclosure, collapsed by default, with click and keyboard access plus synchronized `aria-expanded`.
- When the table's status chips are within the viewport, suppress duplicate status actions in the sticky summary and retain only Telemed, summed target, and gap.
- At notebook widths, the department-target filter controls may wrap into two deliberate rows, but action buttons must remain inside the page without horizontal overflow. Keep the action-required strip compact: performance and target distance on the left, one evidence-based recommendation on the right.
- The Executive summary must avoid technical terms and use short label/value items rather than a dense paragraph. Top 5 must rank only valid below-target rows by positive shortfall and link to the existing department-target tab for full detail.
- Data-quality details belong to Admin. Executive pages show only `ข้อมูลครบถ้วน` or a compact `ข้อมูลควรตรวจสอบ N รายการ` status and never display HN, VN, CID, patient names, SQL, or raw errors.

## ER Subclinic Modal
- Keep the ER card keyboard accessible and show a visible click affordance.
- Show ER main, combined subclinics, and ungrouped/mapping gap before the two cards.
- Distinguish not configured, configured with zero visits, and active visit counts.
- Show mapped DEP codes under each ER subclinic card so admins can verify the source rooms quickly.
- When `ยังไม่จัดกลุ่ม` is positive, make the summary card clickable and expand room-level DEP code, department name, and count details inside the same modal.
- When ER subclinic totals match the main ER total, use calm success wording such as `จัดกลุ่มครบแล้ว` or `ยอดคลินิกย่อยตรงกับยอด ER หลัก`.
- Show the ER settings action only to admin users.

## Executive Overview QA Polish (2026-08-02)
- Date filters display short Thai Buddhist dates while preserving ISO values for request parameters. Date-only parsing must be timezone-safe.
- The overview Top 5 is a compact ranked list with a maximum of five valid below-target rooms. Each row shows room/gap, achieved/target, and progress; it must not create a nested horizontal scrollbar.
- Target progress communicates `evaluated Telemedicine / summed room targets`, uses a teal achieved segment with a neutral remainder, and exposes an accessible progress value. Only the visual width is capped at 100%.
- Trend values use one teal series. The highest period is labelled `สูงสุด` and explained in the tooltip instead of relying on an unexplained accent color.
- `สรุปเพื่อการตัดสินใจ` is limited to two decision lines. `ข้อมูลเพิ่มเติม` is collapsed by default and keeps `aria-expanded` synchronized.
- Data-quality states use aggregate category/impact language only. Never expose patient identifiers, SQL, or raw database errors.
- Responsive QA covers 1366/1024/768/375 widths at 100% zoom with no page-level horizontal overflow.
