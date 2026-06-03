# UI / UX Guide

## Visual Tone
- Hospital dashboard
- Clean, professional, calm
- Focus on readable numbers and quick scanning
- Avoid decorative clutter

## Layout Rules
- Sidebar is role-aware.
- Main content uses panels, KPI cards, charts, and responsive tables.
- Keep operational pages dense but readable.
- Keep executive pages simpler and more summary-focused.
- Executive target charts should stack as full-width panels when labels are long or datasets are dense.
- For Chart.js horizontal bar charts, control height through the chart wrapper, not a fixed `<canvas height="">` attribute.
- For Executive target charts, avoid `height: 100% !important` on canvas and prefer explicit JS sizing when Chart.js auto-responsive behavior stretches the page.
- Set a max bar thickness for horizontal bars so a single row or small dataset does not become an oversized block.
- In the Executive department target tab, order content for quick action: Action Required, executive summary, overall target progress, KPI cards, Top 5 shortage rooms, compact charts, then the full table.
- Keep department target charts focused on Top 10 by default. Top 20/all are optional views for deeper inspection.
- Prefer target-gap charts over percent-only charts when most departments are far below target; executives need to see how many visits must be added.

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
