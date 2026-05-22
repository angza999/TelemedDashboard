# Deploy TelemedDashboard on the same server as itasset app

This project can run on the same Windows server as `itasset app` because it is a separate Node.js/Express app.

Recommended layout:

- `itasset app`: `E:\it-asset-app-itservice`, port `3000`
- `TelemedDashboard`: `E:\TelemedDashboard`, port `4300`

## 1. Configure environment

Create `.env` from `.env.production.example`.

```powershell
Copy-Item .env.production.example .env
```

Edit `.env` and set:

- `PORT=4300`
- `SESSION_SECRET` to a long random value
- default HOSxP MySQL values if needed

Database settings can also be saved from `/settings` by an admin user.

## 2. Install dependencies

```powershell
npm install
```

## 3. Start TelemedDashboard

Run in foreground:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\start-telemed.ps1
```

Run in background:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\start-telemed.ps1 -Hidden
```

Open:

```text
http://server-ip:4300
```

## 4. Stop / status

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\status-telemed.ps1
powershell -ExecutionPolicy Bypass -File .\deploy\stop-telemed.ps1
```

## 5. Auto start on Windows boot

Run PowerShell as Administrator:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\install-telemed-task.ps1
Start-ScheduledTask -TaskName TelemedDashboard
```

Remove auto start:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\uninstall-telemed-task.ps1
```

## 6. Windows Firewall

If other computers cannot open the app, allow inbound TCP port `4300`.

```powershell
New-NetFirewallRule -DisplayName "TelemedDashboard 4300" -Direction Inbound -Protocol TCP -LocalPort 4300 -Action Allow
```

## 7. Quick checks

- itasset app still opens on `http://server-ip:3000`
- TelemedDashboard opens on `http://server-ip:4300`
- Admin can login and open `/settings`
- Dashboard can read HOSxP data
- Excel/PDF export still works
