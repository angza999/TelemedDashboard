# UI / UX Guide

## Visual Tone
- Hospital dashboard
- Clean, professional, calm
- Focus on readable numbers and quick scanning
- Avoid decorative clutter
- Use plain action-oriented Thai labels in executive charts, such as `จำนวน Telemed ที่ทำได้`, instead of ambiguous shorthand.

## Layout Rules
- Sidebar is role-aware.
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
- Department target chart tooltips should show room, service group, OPD total, Telemed achieved, 50% target, Telemed-to-OPD percent, and the gap wording (`ต้องเพิ่ม`, `เกินเป้า`, or `ถึงเป้า`).
- Service-group quick filters should update the whole department target tab, including KPI cards, summaries, charts, table, and Excel export.
- The `/today-patients` page should read as a compact executive dashboard: status/date/last-updated on one line where space allows, manual refresh button on the right, and four equal-height cards with large baseline-aligned numbers plus `คน` units.

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
