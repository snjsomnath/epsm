# Self-Hosted GitHub Runner Setup

Since GitHub-hosted runners cannot reach the VM due to Chalmers firewall (error: `dial tcp 129.16.69.25:22: i/o timeout`), we'll set up a **self-hosted runner** directly on the VM.

## ✅ Benefits of Self-Hosted Runner

- ✅ **No firewall issues** - Runner is on the VM itself
- ✅ **Faster deployments** - No network transfer needed
- ✅ **Direct access** - No SSH required
- ✅ **More secure** - Traffic stays within Chalmers network
- ✅ **Free** - No cost for GitHub Actions minutes

---

## 📋 Step-by-Step Setup

### Step 1: Get Runner Token from GitHub

1. Go to: https://github.com/snjsomnath/epsm/settings/actions/runners/new

2. **Select Linux** and **x64** architecture

3. You'll see commands like this:

```bash
# Download
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.319.1.tar.gz -L https://github.com/actions/runner/releases/download/v2.319.1/actions-runner-linux-x64-2.319.1.tar.gz
tar xzf ./actions-runner-linux-x64-2.319.1.tar.gz

# Configure
./config.sh --url https://github.com/snjsomnath/epsm --token YOUR_TOKEN_HERE
```

**Don't run them yet!** Follow the steps below instead.

---

### Step 2: Install Runner on VM

SSH into your VM and run these commands:

```bash
# Create runner directory
cd /opt/epsm
mkdir -p .github-runner
cd .github-runner

# Download latest runner
curl -o actions-runner-linux-x64-2.319.1.tar.gz -L https://github.com/actions/runner/releases/download/v2.319.1/actions-runner-linux-x64-2.319.1.tar.gz

# Extract
tar xzf ./actions-runner-linux-x64-2.319.1.tar.gz

# Configure (use the token from GitHub)
./config.sh --url https://github.com/snjsomnath/epsm --token YOUR_TOKEN_FROM_GITHUB
```

**Configuration prompts:**
- Runner group: Press Enter (default)
- Runner name: `epsm-vm-runner` (or any name you like)
- Work folder: Press Enter (default: `_work`)
- Labels: Press Enter (default: `self-hosted,Linux,X64`)

---

### Step 3: Install and Start Runner as Service

```bash
# Install as systemd service
sudo ./svc.sh install

# Start the service
sudo ./svc.sh start

# Check status
sudo ./svc.sh status
```

**Expected output:**
```
● actions.runner.snjsomnath-epsm.epsm-vm-runner.service - GitHub Actions Runner (snjsomnath-epsm.epsm-vm-runner)
   Loaded: loaded
   Active: active (running)
```

---

### Step 4: Update Workflow to Use Self-Hosted Runner

The workflow needs to be updated to use `self-hosted` instead of `ubuntu-latest`:

**File:** `.github/workflows/deploy-production.yml`

Change this line:
```yaml
runs-on: ubuntu-latest
```

To:
```yaml
runs-on: self-hosted
```

---

### Step 5: Simplify Workflow (No SSH Needed)

Since the runner is on the VM, we can simplify the deployment:

**Updated workflow:**

```yaml
jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy application
        run: |
          cd /opt/epsm
          
          # Pull latest code
          echo "📥 Pulling latest code..."
          git pull origin main
          
          # Load environment variables
          echo "🔧 Loading environment variables..."
          set -a
          source .env.production
          set +a
          
          # Rebuild and deploy
          echo "🚀 Rebuilding and deploying services..."
          docker-compose -f docker-compose.prod.yml build --no-cache
          docker-compose -f docker-compose.prod.yml up -d
          
          # Wait for services
          echo "⏳ Waiting for services to start..."
          sleep 30
          
          # Run migrations
          echo "📊 Running database migrations..."
          docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate --noinput
          
          # Collect static files
          echo "📁 Collecting static files..."
          docker-compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput
          
          # Clean up
          echo "🧹 Cleaning up..."
          docker system prune -f
          
          # Show status
          echo "✅ Deployment complete!"
          docker-compose -f docker-compose.prod.yml ps
```

---

## 🔧 Verify Runner is Connected

1. Go to: https://github.com/snjsomnath/epsm/settings/actions/runners

2. You should see your runner listed as **"Idle"** with a green dot

3. It will show:
   - Name: `epsm-vm-runner`
   - Status: Idle (green)
   - Labels: `self-hosted`, `Linux`, `X64`

---

## 🚀 Test Deployment

Once the runner is set up and the workflow is updated:

```bash
# Make a test commit
git commit --allow-empty -m "Test self-hosted runner deployment"
git push origin main
```

Watch the deployment at: https://github.com/snjsomnath/epsm/actions

---

## 🛠️ Managing the Runner

### Check Status
```bash
cd /opt/epsm/.github-runner
sudo ./svc.sh status
```

### Stop Runner
```bash
sudo ./svc.sh stop
```

### Start Runner
```bash
sudo ./svc.sh start
```

### Restart Runner
```bash
sudo ./svc.sh restart
```

### View Logs
```bash
sudo journalctl -u actions.runner.snjsomnath-epsm.epsm-vm-runner -f
```

### Uninstall Runner
```bash
# Stop service
sudo ./svc.sh stop

# Uninstall
sudo ./svc.sh uninstall

# Remove registration from GitHub
./config.sh remove --token YOUR_TOKEN
```

---

## 🔒 Security Considerations

### ✅ Best Practices:

1. **Isolate runner directory:**
   - Runner runs as its own user
   - Limited permissions

2. **Keep runner updated:**
   ```bash
   # Runner auto-updates, but you can manually update:
   cd /opt/epsm/.github-runner
   sudo ./svc.sh stop
   ./config.sh remove --token TOKEN
   # Download new version
   ./config.sh --url https://github.com/snjsomnath/epsm --token NEW_TOKEN
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

3. **Monitor runner activity:**
   - Check logs regularly
   - Review workflow runs
   - Set up alerts for failures

4. **Limit workflow permissions:**
   - Only run workflows from `main` branch
   - Require approval for pull requests
   - Use environment protection rules

---

## 📊 Troubleshooting

### Problem: Runner shows "Offline"

**Check if service is running:**
```bash
sudo ./svc.sh status
```

**Restart service:**
```bash
sudo ./svc.sh restart
```

**Check logs:**
```bash
sudo journalctl -u actions.runner.snjsomnath-epsm.epsm-vm-runner -f
```

---

### Problem: Deployment fails with "Permission denied"

**Ensure runner has Docker permissions:**
```bash
sudo usermod -aG docker $(whoami)
sudo systemctl restart docker
```

---

### Problem: Runner uses too much disk space

**Clean up Docker:**
```bash
docker system prune -a --volumes -f
```

**Monitor disk usage:**
```bash
df -h
du -sh /opt/epsm/.github-runner/_work
```

---

## 🎯 Next Steps

1. ✅ Set up self-hosted runner on VM (follow steps above)
2. ✅ Update workflow to use `runs-on: self-hosted`
3. ✅ Push changes to trigger automated deployment
4. ✅ Monitor deployment in GitHub Actions
5. ✅ Enjoy automated deployments without firewall issues! 🎉

---

## 📞 Support

- **GitHub Runner Docs:** https://docs.github.com/en/actions/hosting-your-own-runners
- **Runner Troubleshooting:** https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/monitoring-and-troubleshooting-self-hosted-runners

---

**Ready to set up the self-hosted runner!** This will solve the firewall issue and enable truly automated deployments.
