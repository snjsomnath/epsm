# VM Status Check - Run These Commands

Once you SSH into `epsm.ita.chalmers.se`, run these commands to assess the current state:

---

## 1️⃣ System Information

### Check OS and hostname
```bash
cat /etc/os-release
hostname
uname -a
```

**Expected:** Red Hat Enterprise Linux 9

---

## 2️⃣ Check if Docker is Installed

### Docker version
```bash
docker --version
```

**If not installed:** Need to install Docker

### Docker Compose version
```bash
docker-compose --version
```

**If not installed:** Need to install Docker Compose

### Check if Docker daemon is running
```bash
sudo systemctl status docker
```

**Expected:** Active (running)

### Check Docker permissions
```bash
docker ps
```

**If permission denied:** Need to add user to docker group

---

## 3️⃣ Check Existing Deployments

### Check for existing EPSM installation
```bash
ls -la /opt/epsm
```

**If exists:** EPSM may already be deployed
**If not exists:** Need to clone repository

### Check for running containers
```bash
docker ps -a
```

**Look for:** epsm containers (backend, frontend, database, etc.)

### Check for existing Docker volumes
```bash
docker volume ls | grep epsm
```

**Look for:** epsm_* volumes

---

## 4️⃣ Check Network and Ports

### Check open ports
```bash
sudo netstat -tulpn | grep -E ':(80|443|5432|6379|8000|5173)'
```

**Looking for:**
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 5432 (PostgreSQL) - should be localhost only
- Port 6379 (Redis) - should be localhost only
- Port 8000 (Backend) - may not be exposed
- Port 5173 (Frontend dev) - should not be in production

### Check firewall status
```bash
sudo firewall-cmd --state 2>/dev/null || sudo ufw status
```

### Check if ports are accessible
```bash
curl -I http://localhost 2>/dev/null || echo "Port 80 not responding"
curl -I https://localhost 2>/dev/null || echo "Port 443 not responding"
```

---

## 5️⃣ Check SSL Certificates

### Check for Let's Encrypt certificates
```bash
sudo ls -la /etc/letsencrypt/live/
```

**If exists:** SSL certificates may already be configured

### Check certificate expiry
```bash
sudo certbot certificates 2>/dev/null || echo "Certbot not installed"
```

---

## 6️⃣ Check DNS Resolution

### Check if domain resolves to this server
```bash
nslookup epsm.chalmers.se
```

**Expected:** Should point to this server's IP (129.16.69.25)

### Check hostname
```bash
hostname -f
hostname -I
```

**Expected:** epsm.ita.chalmers.se

---

## 7️⃣ Check Disk Space

### Check available disk space
```bash
df -h
```

**Need:** At least 20GB free for Docker images and data

### Check current disk usage
```bash
du -sh /opt/* 2>/dev/null | sort -h
du -sh /var/lib/docker 2>/dev/null
```

---

## 8️⃣ Check Git Configuration

### Check if Git is installed
```bash
git --version
```

**If not installed:** Need to install git

### Check for existing repository
```bash
ls -la /opt/epsm/.git 2>/dev/null && echo "Git repo exists" || echo "No git repo"
```

### Check current branch and version
```bash
cd /opt/epsm 2>/dev/null && git branch && git log -1 --oneline
```

---

## 9️⃣ Check for Environment Files

### Check for .env files
```bash
ls -la /opt/epsm/.env* 2>/dev/null
```

**Looking for:** .env.production

### Check Nginx configuration
```bash
ls -la /opt/epsm/.docker/nginx/ 2>/dev/null
ls -la /opt/epsm/nginx/ 2>/dev/null
```

---

## 🔟 Check Logs (if deployed)

### Check Docker logs
```bash
cd /opt/epsm 2>/dev/null && docker-compose -f docker-compose.prod.yml logs --tail=50
```

### Check system logs
```bash
sudo journalctl -u docker --since "1 hour ago" --no-pager | tail -20
```

---

## 📋 Quick Status Script

Run this all-in-one script:

```bash
#!/bin/bash

echo "=== EPSM VM Status Check ==="
echo ""

echo "1. System Info:"
echo "Hostname: $(hostname)"
echo "IP: $(hostname -I)"
cat /etc/os-release | grep "^PRETTY_NAME"
echo ""

echo "2. Docker Status:"
docker --version 2>/dev/null || echo "Docker: Not installed"
docker-compose --version 2>/dev/null || echo "Docker Compose: Not installed"
sudo systemctl is-active docker 2>/dev/null || echo "Docker daemon: Not running"
echo ""

echo "3. EPSM Installation:"
[ -d "/opt/epsm" ] && echo "EPSM directory: EXISTS" || echo "EPSM directory: NOT FOUND"
[ -d "/opt/epsm/.git" ] && echo "Git repo: EXISTS" || echo "Git repo: NOT FOUND"
echo ""

echo "4. Running Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers or Docker not accessible"
echo ""

echo "5. Disk Space:"
df -h / | tail -1
echo ""

echo "6. SSL Certificates:"
sudo ls /etc/letsencrypt/live/ 2>/dev/null || echo "No Let's Encrypt certificates"
echo ""

echo "7. Open Ports:"
sudo netstat -tulpn | grep -E ':(80|443)' || echo "Ports 80/443 not open"
echo ""

echo "=== Status Check Complete ==="
```

---

## 🎯 What to Report Back

After running the commands, let me know:

1. **Is Docker installed?** (Yes/No)
2. **Is EPSM already deployed?** (Check `/opt/epsm`)
3. **Are containers running?** (Check `docker ps`)
4. **Are SSL certificates configured?** (Check `/etc/letsencrypt`)
5. **What's the available disk space?** (Check `df -h`)
6. **Any errors or issues?**

This will help me guide you on the next steps!

---

**Copy the quick status script and paste it in your SSH session for a comprehensive overview.**
