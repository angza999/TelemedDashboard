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

## Buttons
- Primary button for main action.
- Secondary button for export or alternative action.
- Icon buttons for logout/action shortcuts.

## Alerts
- Database or SQL mapping errors should be readable and not expose passwords.
- B2B zero alerts should be warning tone, not alarmist.
- Empty data should clearly say no Telemed data in selected range.

## Mobile
- KPI cards should stack.
- Filter forms should become single column.
- Wide tables should scroll horizontally, not shrink into unreadable columns.
