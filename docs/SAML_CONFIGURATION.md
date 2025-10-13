# SAML Configuration for EPSM

## Overview
EPSM uses SAML 2.0 for Single Sign-On (SSO) with Chalmers Identity Provider (IDP).

## Service Provider Configuration

### Entity ID
```
https://epsm.chalmers.se/saml/metadata/
```

### Assertion Consumer Service (ACS) URL
```
https://epsm.chalmers.se/saml/acs/
```

### Single Logout Service (SLO) URL
```
https://epsm.chalmers.se/saml/sls/
```

## Identity Provider Configuration

### Chalmers IDP Metadata URL
```
https://www.ita.chalmers.se/idp.chalmers.se.xml
```

## Required Attributes from IDP

The application requires the following SAML attributes from Chalmers IDP:

- `givenName` → User's first name
- `sn` → User's last name  
- `mail` → User's email address

## Updating SAML Registration at Chalmers

### Contact Chalmers IT Support
To register or update the SAML service provider configuration:

**Email:** it-support@chalmers.se  
**Subject:** SAML Service Provider Registration/Update for EPSM

**Provide the following information:**

1. **Service Name:** Energy Performance Simulation Manager (EPSM)
2. **Entity ID:** `https://epsm.chalmers.se/saml/metadata/`
3. **ACS URL:** `https://epsm.chalmers.se/saml/acs/`
4. **SLO URL:** `https://epsm.chalmers.se/saml/sls/`
5. **Required Attributes:** givenName, sn, mail
6. **Contact Person:** 
   - Name: Sanjay Somanath
   - Email: ssanjay@chalmers.se
   - Role: Technical Contact

### Metadata XML
You can also provide the SP metadata XML by accessing:
```
https://epsm.chalmers.se/saml/metadata/
```

This URL provides the complete SAML metadata that Chalmers IT can import directly.

## Troubleshooting

### Common Issues

#### 1. SAML Response Error
**Symptom:** `saml2.response.StatusError: Unsuccessful operation`  
**Cause:** Entity ID or ACS URL mismatch between EPSM and Chalmers IDP  
**Solution:** Verify that Chalmers IDP has the correct Entity ID registered

#### 2. Stuck at /saml/acs/ redirect
**Symptom:** After Chalmers login, user is redirected to `/saml/acs/` but cannot proceed  
**Cause:** ACS URL not registered at Chalmers IDP  
**Solution:** Contact Chalmers IT to register the ACS URL

#### 3. Missing user attributes
**Symptom:** Login succeeds but user profile is incomplete  
**Cause:** Required SAML attributes not provided by IDP  
**Solution:** Verify attribute mappings with Chalmers IT

## Testing SAML

### 1. Access the login page
```
https://epsm.chalmers.se/saml/login/
```

### 2. Check SAML metadata
```
https://epsm.chalmers.se/saml/metadata/
```

### 3. Review backend logs
On production server:
```bash
docker logs epsm_backend_prod --tail=100
```

Look for SAML-related errors or warnings.

## Security Considerations

- SAML communications are encrypted via HTTPS
- Session timeout is set to 12 hours (43200 seconds)
- CSRF protection is enabled
- All SAML endpoints require valid signatures

## Environment Variables

The following environment variables control SAML behavior:

```bash
SAML_IDP_METADATA_URL=https://www.ita.chalmers.se/idp.chalmers.se.xml
SAML_ENTITY_ID=https://epsm.chalmers.se/saml/metadata/
SAML_SESSION_COOKIE_AGE=43200
SAML_ATTRIBUTE_MAPPING_FIRST_NAME=givenName
SAML_ATTRIBUTE_MAPPING_LAST_NAME=sn
SAML_ATTRIBUTE_MAPPING_EMAIL=mail
```

These are automatically configured during deployment via GitHub Actions.
