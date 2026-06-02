# Known Issues And Risks

## HOSxP Field Differences
The executive department target tab currently uses `ovst.main_dep`. Some HOSxP databases may use `cur_dep` or another department field.

If department target SQL fails with `ER_BAD_FIELD_ERROR`, check `src/services/executiveService.js`.

## Session Store
The project currently uses `express-session` MemoryStore. It works for small internal deployment but is not ideal for long-running production.

## Thai Text In Windows Terminal
Some PowerShell/terminal output may display Thai as mojibake. The files are UTF-8 and browser rendering is normally correct.

## Query Tool Is Powerful
Even though Query Tool is SELECT-only, admin can still query sensitive patient data. Keep it admin-only and remind users not to export patient-level data unnecessarily.

## HTTP LAN Browser Behavior
Chrome/Edge may remember HTTPS attempts for `192.168.1.231:4300`. If CSS appears unstyled due `ERR_SSL_PROTOCOL_ERROR`, clear browser HSTS/site state or use a fresh browser profile.

## Runtime Files Are Not In Git
The following are intentionally not committed:
- `data/users.json`
- `data/db-config.json`
- `data/query-tool.log.jsonl`
- `.env`

Server deployment needs these files configured locally.

