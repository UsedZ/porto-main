# SSH & Network Security Hardening Guide
**System:** Linux Mint (xia) | **User:** sync-id | **Updated:** 2026-11-16
**Purpose:** Reference for any agent using SSH on this machine

---

## 🔐 SSH SERVER STATUS
**SSH Server (sshd) is NOT INSTALLED** — only SSH **client** is used for outbound tunnels.

### SSH Client Config (User)
```bash
# Location: ~/.ssh/config
# Keys: ~/.ssh/9router-aws-ed25519 (ed25519, no passphrase)
# Known hosts: ~/.ssh/known_hosts
```

### Active SSH Tunnels (systemd --user services)
| Service | Local Port | Remote Host | Remote Port | Purpose |
|---------|------------|-------------|-------------|---------|
| `9router-tunnel.service` | 127.0.0.1:20128 | ubuntu@100.126.55.25 | 20128 | 9Router API |
| `freellmapi-tunnel.service` | 127.0.0.1:3001 | ubuntu@100.126.55.25 | 3001 | freellmapi |
| `dsh-ofm-tunnel.service` | 127.0.0.1:18900 | ubuntu@100.126.55.25 | 18900 | DSH OFM |

**All tunnels:**
- Auto-restart on failure (`Restart=always`, `RestartSec=5s`)
- SSH options: `BatchMode=yes`, `ExitOnForwardFailure=yes`, `ServerAliveInterval=30`, `StrictHostKeyChecking=yes`
- Key: `~/.ssh/9router-aws-ed25519`
- Target: `ubuntu@100.126.55.25` (AWS via Tailscale)

---

## 🛡️ FIREWALL (UFW) — ACTIVE

### Current Rules (Persistent)
```bash
# Default: deny incoming, allow outgoing
# Rules applied 2026-11-16

# Loopback — full access
Anywhere on lo             ALLOW IN

# Tailscale interface — full access  
Anywhere on tailscale0     ALLOW IN

# SSH (port 22) — LAN only (enp2s0)
22 on enp2s0               ALLOW IN    # SSH LAN

# Portfolio (port 3010) — LAN + Tailscale only
3010 on enp2s0             ALLOW IN    # Portfolio LAN
3010 on tailscale0         ALLOW IN    # Portfolio Tailscale
```

### Key Principle
**No blanket `allow from 192.168.18.0/24`** — rules are interface-specific.

### Commands for Agents
```bash
sudo ufw status verbose           # View rules
sudo ufw status numbered          # View with numbers (for delete)
sudo ufw allow in on <iface> to any port <port>  # Add rule
sudo ufw delete <num>             # Delete by number
sudo ufw reload                   # Reload rules
```

---

## 🚫 FAIL2BAN — ACTIVE

### Jails Enabled
| Jail | Filter | Max Retry | Ban Time | Log Source |
|------|--------|-----------|----------|------------|
| `sshd` | sshd | 3 | 1 hour | systemd journal |
| `ufw` | ufw (custom) | 5 | 2 hours | /var/log/ufw.log |

### Custom UFW Filter
**File:** `/etc/fail2ban/filter.d/ufw.conf`
```ini
[Definition]
failregex = ^.*\[UFW BLOCK\].* SRC=<HOST>
ignoreregex =
```

### Commands for Agents
```bash
sudo fail2ban-client status           # List jails
sudo fail2ban-client status sshd      # SSH jail status
sudo fail2ban-client status ufw       # UFW jail status
sudo fail2ban-client set sshd unbanip <IP>  # Unban IP
sudo systemctl restart fail2ban       # Restart service
```

---

## 🌐 NETWORK INTERFACES

| Interface | IP | Purpose | Firewall Zone |
|-----------|-----|---------|---------------|
| `enp2s0` | 192.168.18.10/24 | Ethernet LAN | UFW rules for 22, 3010 |
| `tailscale0` | 100.127.225.42/32 | Tailscale VPN | UFW allow all |
| `lo` | 127.0.0.1/8 | Loopback | UFW allow all |
| `wlp3s0` | DOWN | WiFi (unused) | — |
| `virbr0`, `virbr-kali` | DOWN | Libvirt VMs | — |
| `docker0`, `br-*` | DOWN | Docker (unused) | — |

---

## 🔑 SSH KEYS & ACCESS

### Private Key (DO NOT SHARE)
```
~/.ssh/9router-aws-ed25519          # ed25519, AWS tunnel key
~/.ssh/9router-aws-ed25519.pub      # Public key
```

### Known Hosts
```
~/.ssh/known_hosts                  # Contains 100.126.55.25 (AWS)
```

### SSH Agent (Optional)
```bash
eval $(ssh-agent -s)
ssh-add ~/.ssh/9router-aws-ed25519
```

---

## 📦 SERVICES THAT AUTO-START ON BOOT

### System Services (systemctl)
```bash
sudo systemctl enable --now tailscaled    # Tailscale VPN
sudo systemctl enable --now docker        # Docker Engine
sudo systemctl enable --now postgresql    # PostgreSQL
sudo systemctl enable --now fail2ban      # Intrusion prevention
```

### User Services (systemctl --user)
```bash
systemctl --user enable --now 9router-tunnel.service
systemctl --user enable --now freellmapi-tunnel.service
systemctl --user enable --now dsh-ofm-tunnel.service
systemctl --user enable --now portfolio-nextjs.service
systemctl --user enable --now hermes-gateway.service
systemctl --user enable --now hermes-health-monitor.timer
```

---

## 🚀 PORTFOLIO SERVER (Next.js)

### Service File
**Location:** `~/.config/systemd/user/portfolio-nextjs.service`
```ini
[Service]
WorkingDirectory=/home/sync-id/Documents/BackUP_Migrasi/porto-local/porto-main
ExecStart=/usr/local/bin/npm run start -- -p 3010
Restart=always
RestartSec=5s
Environment=NODE_ENV=production
```

### Access URLs
- **Local:** http://localhost:3010
- **LAN:** http://192.168.18.10:3010 (UFW allowed on enp2s0)
- **Tailscale:** http://100.127.225.42:3010 (UFW allowed on tailscale0)

---

## 📋 QUICK REFERENCE FOR AGENTS

### Check All Tunnels
```bash
systemctl --user status 9router-tunnel.service freellmapi-tunnel.service dsh-ofm-tunnel.service
```

### Check Portfolio
```bash
systemctl --user status portfolio-nextjs.service
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3010
```

### Check Firewall
```bash
sudo ufw status verbose
```

### Check Fail2Ban
```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
sudo fail2ban-client status ufw
```

### Restart Everything Cleanly
```bash
# Tunnels
systemctl --user restart 9router-tunnel.service freellmapi-tunnel.service dsh-ofm-tunnel.service

# Portfolio
systemctl --user restart portfolio-nextjs.service

# Firewall (rarely needed)
sudo ufw reload

# Fail2Ban
sudo systemctl restart fail2ban
```

---

## ⚠️ IMPORTANT NOTES FOR AGENTS

1. **NO SSH SERVER** — Do not try to configure `/etc/ssh/sshd_config` (doesn't exist)
2. **Tunnels use SSH CLIENT only** — All tunnels are outbound from this machine
3. **UFW rules are interface-specific** — Not CIDR-based
4. **Fail2Ban monitors UFW blocks** — Custom filter at `/etc/fail2ban/filter.d/ufw.conf`
5. **Portfolio binds to `*:3010`** — But UFW restricts to enp2s0 + tailscale0 only
6. **All config is persistent** — Survives reboot

---

## 📁 KEY FILE LOCATIONS

| Config | Path |
|--------|------|
| UFW Rules | `/etc/ufw/` (managed via `ufw` command) |
| Fail2Ban Jail | `/etc/fail2ban/jail.local` |
| Fail2Ban UFW Filter | `/etc/fail2ban/filter.d/ufw.conf` |
| SSH Client Config | `~/.ssh/config` |
| SSH Keys | `~/.ssh/9router-aws-ed25519*` |
| User Services | `~/.config/systemd/user/*.service` |
| Portfolio Project | `/home/sync-id/Documents/BackUP_Migrasi/porto-local/porto-main/` |
| This Guide | `~/.hermes/ssh-hardening-guide.md` |

---

**Last Verified:** 2026-11-16 — All services active, UFW restrictive, Fail2Ban running, tunnels connected.

---

# AI Monitor Dashboard — Admin Auth & Privacy Setup

**Component:** `/admin/ai-monitor` + `/api/admin/*` in the portfolio project above.
**Mode:** local-only. No credentials are shipped, logged, or hardcoded.

## 🔐 Required environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ADMIN_USER` | yes | Basic Auth username for every `/api/admin/*` route |
| `ADMIN_PASS` | yes | Basic Auth password for every `/api/admin/*` route |
| `FREELLMAPI_API_KEY` | yes (already present) | Server-side AI upstream key; never sent to the browser |
| `AI_CHAT_UPSTREAM_URL` | no | Overrides the default `http://127.0.0.1:3001/v1/chat/completions` |

`IP_HASH_SALT` is **not** implemented — see the privacy section below.

## 🛡️ Fail-closed behaviour (verified)

- `ADMIN_USER` **or** `ADMIN_PASS` unset/empty → every `/api/admin/*` endpoint returns **503** `{"error":"Admin auth not configured"}`, regardless of headers.
- Configured but missing/invalid credentials → **401** with `WWW-Authenticate: Basic realm="Admin"`.
- Valid credentials → request proceeds.
- There are **no default credentials and no bypass**. The dashboard page itself is public, but its stats/logs/messages/export fetches fail closed, so no data leaves the server until credentials are provisioned.

## ▶️ Safe owner setup (do this yourself; no secret is written here)

1. Choose a username and a long random password (e.g. `openssl rand -hex 24`).
2. Append to the project's untracked `.env.local` (git-ignored):
   ```
   ADMIN_USER=<your-username>
   ADMIN_PASS=<your-random-password>
   ```
3. Restart the server so the new environment is loaded.
4. Open `/admin/ai-monitor`. The browser issues a Basic Auth challenge; enter the credentials once. The dashboard shows an **Authorized** badge and loads data.
5. Never commit `.env.local`, never paste the credentials into chat/logs, and never put them in the AI chat path (`/api/ai/chat` has no admin dependency).

To confirm the gate without credentials: `curl -o /dev/null -w '%{http_code}' http://127.0.0.1:3010/api/admin/ai-stats` → `503` when unset, `401` when configured.

## 📋 Privacy & retention — known outstanding items (not implemented)

The architecture spec proposed IP hashing, retention/TTL purge jobs, a consent banner, and an admin audit log. These were deliberately **not** implemented in this pass, because they need an explicit functional plan and owner sign-off:

- `sessions.ip` is still stored in plaintext; no `IP_HASH_SALT` hashing for display.
- No automatic purge/TTL for messages or raw IPs.
- No consent notice in `AIChat`.
- No admin access audit log.

Chat content and session metadata are retained in `data/conversations.db` (WAL). Existing rows are preserved by the migration; nothing is truncated or deleted. Treat that file as private user data.

**Admin CSV export note:** exports currently include the raw `ip` column for sessions. Do not share session exports outside the owner.