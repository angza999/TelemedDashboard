# Deploy on Linux server 192.168.1.231

Server path:

```text
/home/telemed/TelemedDashboard
```

Recommended app URL:

```text
http://192.168.1.231:4300
```

## 1. Go to project folder

```bash
cd /home/telemed/TelemedDashboard
```

## 2. Create .env

```bash
cp .env.production.example .env
nano .env
```

Set at least:

```env
NODE_ENV=production
PORT=4300
SESSION_SECRET=change-this-to-a-long-random-production-secret
```

HOSxP database settings can be edited in `.env` or from the admin Database Settings page.

## 3. Install and run with systemd

```bash
chmod +x deploy/linux-install-systemd.sh deploy/linux-start.sh deploy/linux-status.sh
./deploy/linux-install-systemd.sh
```

## 4. Useful commands

```bash
sudo systemctl status telemed-dashboard
sudo systemctl restart telemed-dashboard
sudo systemctl stop telemed-dashboard
journalctl -u telemed-dashboard -f
```

Project log files:

```text
/home/telemed/TelemedDashboard/output/telemed-server.out.log
/home/telemed/TelemedDashboard/output/telemed-server.err.log
```

## 5. Firewall

Ubuntu/Debian with UFW:

```bash
sudo ufw allow 4300/tcp
sudo ufw status
```

firewalld:

```bash
sudo firewall-cmd --permanent --add-port=4300/tcp
sudo firewall-cmd --reload
```

## 6. Check from another computer

Open:

```text
http://192.168.1.231:4300
```

If it does not open, check:

- Node.js is installed.
- `systemctl status telemed-dashboard` is running.
- Linux firewall allows port `4300`.
- Network firewall allows clients to reach `192.168.1.231:4300`.
