# EPSM SAML Deployment - Quick Reference Guide

## 📋 What Was Done

Based on Björn's email, I've completed the following:

### 1. ✅ Privacy Policy Created
- **File:** `docs/PRIVACY_POLICY.md`
- **Web View:** `/privacy/` endpoint (HTML)
- **Requirements:** GDPR compliant, REFEDS Personalized Access compliant
- **Content:** Data collection, usage, retention, user rights, contact info

### 2. ✅ SAML Configuration Updated
- **Updated:** `backend/config/saml_hooks.py` - REFEDS attribute mapping
- **Created:** `backend/config/settings/production.py` - Production SAML settings
- **IdP Metadata URL:** `https://www.ita.chalmers.se/idp.chalmers.se.xml`
- **Entity Category:** REFEDS Personalized Access

### 3. ✅ Deployment Docs Updated
- **File:** `docs/DEPLOYMENT_CHALMERS.md`
- **Updates:** VM naming, IdP URL, entity category, SSL guidance

---

## 📧 Email Ready to Send

**File:** `docs/EMAIL_TO_BJORN_RESPONSE.txt`

Copy and send this email to Björn to confirm:
- You'll use REFEDS Personalized Access entity category
- You understand the IdP metadata URL
- You've prepared the privacy policy
- You'll use Let's Encrypt for SSL

---

## 🔑 Key REFEDS Personalized Access Attributes

| Attribute | OID | Purpose |
|-----------|-----|---------|
| `eduPersonPrincipalName` | 1.3.6.1.4.1.5923.1.1.1.6 | Unique identifier |
| `samlSubjectID` | - | Alternative persistent ID |
| `mail` | 0.9.2342.19200300.100.1.3 | Email address |
| `displayName` | 2.16.840.1.113730.3.1.241 | Full name |
| `givenName` | 2.5.4.42 | First name |
| `sn` | 2.5.4.4 | Last name |
| `eduPersonScopedAffiliation` | 1.3.6.1.4.1.5923.1.1.1.9 | Organizational role |
| `schacHomeOrganization` | 1.3.6.1.4.1.25178.1.2.9 | Home organization |

---

## 🚀 Deployment Checklist

### Before Deployment:
- [ ] Wait for VM provisioning from Chalmers IT
- [ ] Send email to Björn (use `EMAIL_TO_BJORN_RESPONSE.txt`)

### During Deployment:
```bash
# SSH into VM
ssh your-cid@[vm-hostname].ita.chalmers.se

# Clone repository
cd /opt
sudo git clone https://github.com/snjsomnath/epsm.git
cd epsm

# Create .env.production
nano .env.production
# Add:
DJANGO_SETTINGS_MODULE=config.settings.production
SAML_IDP_METADATA_URL=https://www.ita.chalmers.se/idp.chalmers.se.xml
SECRET_KEY=<generate-random-secret>
DEBUG=False

# Start services
docker-compose -f docker-compose.production.yml up -d

# Generate SAML metadata
docker-compose -f docker-compose.production.yml exec backend \
  python manage.py saml_metadata > sp_metadata.xml

# Verify privacy policy is accessible
curl https://epsm.chalmers.se/privacy/
```

### After Deployment:
- [ ] Send `sp_metadata.xml` to Björn
- [ ] Include privacy policy URL: `https://epsm.chalmers.se/privacy`
- [ ] Wait for SAML registration confirmation
- [ ] Test login with your CID

---

## 🧪 Testing SAML After Registration

1. Visit `https://epsm.chalmers.se`
2. Click "Login with Chalmers CID"
3. You'll be redirected to Chalmers IdP
4. Enter your CID and password
5. Check your user details in Django admin:
   ```bash
   docker-compose -f docker-compose.production.yml exec backend \
     python manage.py shell
   ```
   ```python
   from django.contrib.auth.models import User
   user = User.objects.get(username='ssanjay')
   print(f"Username: {user.username}")
   print(f"Email: {user.email}")
   print(f"Name: {user.first_name} {user.last_name}")
   print(f"Staff: {user.is_staff}")
   print(f"Superuser: {user.is_superuser}")
   ```

---

## 📚 Files Created/Modified

### New Files:
1. `docs/PRIVACY_POLICY.md` - Privacy policy document
2. `backend/config/settings/production.py` - Production SAML settings
3. `backend/simulation/privacy_views.py` - Privacy policy views
4. `backend/templates/privacy_policy.html` - Privacy policy HTML template
5. `docs/EMAIL_TO_BJORN_RESPONSE.txt` - Email draft for Björn
6. `change summary/REFEDS_PERSONALIZED_ACCESS_IMPLEMENTATION.md` - Full summary

### Modified Files:
1. `backend/config/saml_hooks.py` - REFEDS attribute mapping
2. `backend/config/urls.py` - Privacy policy URL routes
3. `backend/requirements.prod.txt` - Added markdown dependency
4. `docs/DEPLOYMENT_CHALMERS.md` - Updated with Björn's info

---

## 🔍 Troubleshooting

### SAML Login Issues:
```bash
# Check SAML logs
docker-compose -f docker-compose.production.yml logs backend | grep -i saml

# Check attribute mapping
docker-compose -f docker-compose.production.yml logs backend | grep -i "custom_update_user"
```

### Privacy Policy Not Loading:
```bash
# Check if template exists
docker-compose -f docker-compose.production.yml exec backend \
  ls -la /app/templates/privacy_policy.html

# Check URL routing
docker-compose -f docker-compose.production.yml exec backend \
  python manage.py show_urls | grep privacy
```

### Attribute Mapping Issues:
- Check `backend/logs/django.log` for detailed attribute mapping logs
- Verify IdP is sending correct attributes in SAML assertion
- Review `config.saml_hooks` logger output (DEBUG level)

---

## 📞 Contacts

- **Chalmers IT (Björn):** biorn@chalmers.se, +46 31 772 6600
- **Chalmers IT Support:** support@chalmers.se, +46 31 772 6000
- **EPSM Developer:** sanjay.somanath@chalmers.se
- **Principal Investigator:** alexander.hollberg@chalmers.se

---

## 🎯 Summary

**Status:** ✅ ALL COMPLETE - Ready for deployment pending VM provisioning

**Next Action:** Send email to Björn (use `EMAIL_TO_BJORN_RESPONSE.txt`)

**Key Changes:**
- Privacy policy created and ready at `/privacy/`
- SAML configured for REFEDS Personalized Access
- Attribute mapping updated (eduPersonPrincipalName, samlSubjectID, etc.)
- IdP metadata URL confirmed: `https://www.ita.chalmers.se/idp.chalmers.se.xml`
- Let's Encrypt SSL recommended

**Deployment Ready:** YES ✅
