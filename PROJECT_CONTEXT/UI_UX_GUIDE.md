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
- Order the overview for rapid scanning: compact filters, four headline KPIs, DM/HT/B2B/B2C breakdown, a compact Top 5 room ranking beside 3-5 decision insights, then trend and distribution charts.
- Explain that the previous-period comparison uses the immediately preceding date range with the same number of days.
- If the minimum-service day is the selected range's final day, keep the value but add a restrained note that the day's data may still be incomplete.
- Keep ICD-code and other technical metric hints visible only to admins; executive users should see plain-language labels.
- Use Thai metric labels and `ครั้ง` for Telemed service counts. Department-target OPD reporting may retain `ราย`.
- Show comparison with the immediately preceding period and keep the zero-denominator state explicit instead of displaying a misleading percentage.
- The trend chart should show the total series, a subdued average line, a visible peak marker, and a tooltip containing Total, DM, HT, B2B, and B2C from the same response payload.
- Keep the B2B/B2C donut compact with a center value. If B2B is zero but B2C exists, show B2C 100% and the real total rather than an empty state.
- Prefer compact HTML comparison bars for DM/HT when a large chart adds little decision value.
- Store adjustable executive targets in WebApp configuration only. Never write dashboard targets or settings to HOSxP.
- PDF export should expose a visible generating/success/error state and prevent duplicate clicks while the same export is running.
- The `/executive?tab=department-target` action summary should include one short, evidence-based recommendation from the active result set. Prioritize data-quality review, then the largest remaining target gap, then near-target follow-up, and finally the all-passed state. Do not speculate about a clinical or workflow cause.
- For department targets, always show a compact `ใกล้ถึงเป้า` or no-near-target state and a `ข้อมูลควรตรวจสอบ` or no-anomaly state; empty panels make the executive workflow ambiguous. Keep anomaly rows out of performance charts and pass/fail highlights.
- When no eligible department rows exist, replace the chart canvas with a compact explanation instead of leaving empty axes. If the gap chart has no below-target room, show the compact all-clear state in the existing chart panel.
- Formula information icons must provide a title and keyboard-accessible label. Target total must state that it is the sum of each room's rounded 50% target, so it can differ slightly from 50% of combined OPD.
- Prefer restrained motion: card hover lift, progress/sticky transitions, and dialogs may animate subtly, but all of them must honor `prefers-reduced-motion`.

## ER Subclinic Modal
- Keep the ER card keyboard accessible and show a visible click affordance.
- Show ER main, combined subclinics, and ungrouped/mapping gap before the two cards.
- Distinguish not configured, configured with zero visits, and active visit counts.
- Show mapped DEP codes under each ER subclinic card so admins can verify the source rooms quickly.
- When `ยังไม่จัดกลุ่ม` is positive, make the summary card clickable and expand room-level DEP code, department name, and count details inside the same modal.
- When ER subclinic totals match the main ER total, use calm success wording such as `จัดกลุ่มครบแล้ว` or `ยอดคลินิกย่อยตรงกับยอด ER หลัก`.
- Show the ER settings action only to admin users.
