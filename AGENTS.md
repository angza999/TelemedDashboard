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
