# GitHub Secrets Setup for Automated Deployment

This guide shows you how to configure GitHub Secrets to enable automated deployments to your Chalmers VM.

---

## 🔑 Required Secrets

You need to configure **3 secrets** in your GitHub repository:

| Secret Name | Description | Value |
|-------------|-------------|-------|
| `PROD_HOST` | VM hostname | `epsm.ita.chalmers.se` |
| `PROD_USER` | SSH username | `ssanjay` |
| `PROD_SSH_KEY` | Private SSH key | Your private key content |

---

## 📝 Step-by-Step Setup

### Step 1: Get Your SSH Private Key

On your **local machine**, get your private SSH key:

```bash
# Display your private key
cat ~/.ssh/id_rsa

# Or if you use a different key:
cat ~/.ssh/id_ed25519
```

**Copy the entire output**, including:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- All the key content
- `-----END OPENSSH PRIVATE KEY-----`

⚠️ **IMPORTANT:** This is your PRIVATE key. Never share it publicly or commit it to a repository.

---

### Step 2: Add Secrets to GitHub

1. **Go to your GitHub repository:**
   - Navigate to: https://github.com/snjsomnath/epsm

2. **Open Settings:**
   - Click the "⚙️ Settings" tab at the top

3. **Navigate to Secrets:**
   - In the left sidebar, click "Secrets and variables" → "Actions"

4. **Add each secret:**

#### Secret 1: PROD_HOST
- Click "New repository secret"
- Name: `PROD_HOST`
- Value: `epsm.ita.chalmers.se`
- Click "Add secret"

#### Secret 2: PROD_USER
- Click "New repository secret"
- Name: `PROD_USER`
- Value: `ssanjay` (or your SSH username)
- Click "Add secret"

#### Secret 3: PROD_SSH_KEY
- Click "New repository secret"
- Name: `PROD_SSH_KEY`
- Value: Paste your entire private key (from Step 1)
- Click "Add secret"

---

## ✅ Verify Secrets Are Set

After adding all secrets, you should see them listed in the Secrets page:

```
Secrets (3)
├── PROD_HOST        Updated X seconds ago
├── PROD_SSH_KEY     Updated X seconds ago
└── PROD_USER        Updated X seconds ago
```

---

## 🚀 Testing the Workflow

### Option 1: Push to Main Branch

Any push to `main` branch will trigger automatic deployment:

```bash
# Make a small change
git commit --allow-empty -m "Test automated deployment"
git push origin main
```

### Option 2: Manual Trigger

1. Go to: https://github.com/snjsomnath/epsm/actions
2. Click on "Deploy to Production" workflow
3. Click "Run workflow" button
4. Select `main` branch
5. Click "Run workflow"

---

## 📊 Monitor Deployment

1. Go to: https://github.com/snjsomnath/epsm/actions
2. Click on the running workflow
3. Click on the "deploy" job
4. Expand "Deploy to Production VM" step to see logs

You'll see output like:
```
📥 Pulling latest code...
🔧 Loading environment variables...
🚀 Rebuilding and deploying services...
⏳ Waiting for services to start...
📊 Running database migrations...
📁 Collecting static files...
🧹 Cleaning up...
✅ Deployment complete!
```

---

## 🔒 Security Best Practices

### ✅ DO:
- Keep your private key secure
- Use strong SSH key passphrases
- Rotate SSH keys periodically
- Review deployment logs for issues

### ❌ DON'T:
- Share your private key
- Commit secrets to git
- Use the same key for multiple services
- Leave unused secrets in GitHub

---

## 🛠️ Troubleshooting

### Problem: "PROD_HOST secret is not set"

**Solution:** Make sure the secret name is exactly `PROD_HOST` (case-sensitive)

### Problem: "Permission denied (publickey)"

**Solutions:**
1. Verify your public key is in `~/.ssh/authorized_keys` on the VM
2. Check that you copied the entire private key including headers
3. Ensure the private key matches the public key on the VM

```bash
# On VM, check authorized keys
cat ~/.ssh/authorized_keys

# On local machine, get public key
cat ~/.ssh/id_rsa.pub
```

### Problem: "Network unreachable"

**Possible causes:**
- Chalmers firewall blocking GitHub runners
- VM is down
- DNS resolution issues

**Solutions:**
1. Check if VM is accessible: `ping epsm.ita.chalmers.se`
2. Consider using a self-hosted GitHub runner on Chalmers network
3. Contact Chalmers IT to allow GitHub's IP ranges

---

## 📋 GitHub Runner IP Ranges

If Chalmers firewall blocks GitHub runners, you may need to allow these IP ranges:

Get current IP ranges:
```bash
curl https://api.github.com/meta | jq .actions
```

Contact Chalmers IT (support@chalmers.se) to whitelist these IPs.

---

## 🔄 Self-Hosted Runner (Alternative)

If GitHub-hosted runners can't reach the VM, set up a self-hosted runner:

### On the VM:

1. Go to: https://github.com/snjsomnath/epsm/settings/actions/runners/new
2. Follow the instructions to download and configure the runner
3. Run the runner as a service

### Update Workflow:

```yaml
jobs:
  deploy:
    runs-on: self-hosted  # Change from ubuntu-latest
```

**Benefits:**
- No network issues (runner is on Chalmers network)
- Faster deployments (no internet transfer)
- No SSH needed (runner has direct access)

**Considerations:**
- Requires maintaining the runner
- Runner must stay online
- Uses VM resources

---

## ✨ What Happens on Each Deployment

When you push to `main`, the workflow automatically:

1. ✅ Validates all secrets are configured
2. ✅ Tests network connectivity to VM
3. ✅ SSHs into the VM
4. ✅ Pulls latest code from GitHub
5. ✅ Loads environment variables
6. ✅ Rebuilds Docker images with latest code
7. ✅ Restarts all services
8. ✅ Runs database migrations
9. ✅ Collects static files
10. ✅ Cleans up old Docker images
11. ✅ Shows deployment status

**Total time:** ~5-10 minutes (depending on changes)

---

## 📞 Support

If you encounter issues:

1. Check the workflow logs in GitHub Actions
2. SSH into VM and check Docker logs: `docker-compose -f docker-compose.prod.yml logs`
3. Review this guide: `GITHUB_SECRETS_SETUP.md`
4. Check deployment guide: `DEPLOYMENT_STEPS.md`

---

## 🎉 Success Criteria

After setup, you should be able to:

- ✅ Push code to `main` and see automatic deployment
- ✅ View deployment progress in GitHub Actions
- ✅ Access https://epsm.chalmers.se with latest changes
- ✅ See deployment status in workflow logs

---

**Ready to set up automated deployments!** 🚀

Follow the steps above to configure your GitHub Secrets, then push to `main` to trigger your first automated deployment.
