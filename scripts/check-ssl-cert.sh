#!/usr/bin/env bash
# =============================================================================
# Check SSL Certificate
# =============================================================================
# Quick script to check which SSL certificate nginx is actually using
# =============================================================================

set -e

echo "========================================================================" 
echo "  🔐 Checking SSL Certificate Configuration"
echo "========================================================================"
echo ""

echo "📋 Certificate file location:"
ls -lh /opt/epsm/nginx/ssl/ 2>/dev/null || echo "❌ Directory doesn't exist"
echo ""

echo "📋 Certificate details from file:"
openssl x509 -in /opt/epsm/nginx/ssl/fullchain.pem -noout -text 2>/dev/null | grep -A 2 "Subject Alternative Name" || echo "❌ Cannot read certificate"
echo ""

echo "📋 Certificate domains:"
openssl x509 -in /opt/epsm/nginx/ssl/fullchain.pem -noout -text 2>/dev/null | grep DNS: || echo "❌ Cannot read certificate"
echo ""

echo "📋 Let's Encrypt certificate (if exists):"
if [ -d "/etc/letsencrypt/live/epsm.chalmers.se" ]; then
    echo "✓ Found at: /etc/letsencrypt/live/epsm.chalmers.se"
    sudo openssl x509 -in /etc/letsencrypt/live/epsm.chalmers.se/fullchain.pem -noout -text 2>/dev/null | grep DNS: || echo "❌ Cannot read"
elif [ -d "/etc/letsencrypt/live/epsm.ita.chalmers.se" ]; then
    echo "✓ Found at: /etc/letsencrypt/live/epsm.ita.chalmers.se"
    sudo openssl x509 -in /etc/letsencrypt/live/epsm.ita.chalmers.se/fullchain.pem -noout -text 2>/dev/null | grep DNS: || echo "❌ Cannot read"
else
    echo "❌ No Let's Encrypt certificate found"
fi
echo ""

echo "📋 What the browser sees:"
echo "Testing epsm.chalmers.se:"
openssl s_client -connect epsm.chalmers.se:443 -servername epsm.chalmers.se </dev/null 2>/dev/null | openssl x509 -noout -text | grep DNS: || echo "❌ Connection failed"
echo ""

echo "========================================================================"
echo "✅ Check complete"
echo "========================================================================"
