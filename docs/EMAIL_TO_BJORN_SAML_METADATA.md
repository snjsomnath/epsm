# Email to Björn - SAML Metadata for EPSM

**To:** Björn Lundell <bjorn.lundell@chalmers.se>  
**Subject:** SAML Metadata URL for EPSM Integration with Chalmers IdP  
**Date:** 8 October 2025

---

Hi Björn,

The EPSM (Energy Performance Simulation Manager) application is now deployed at **epsm.chalmers.se** and ready for SAML SSO integration with the Chalmers Identity Provider.

## SAML Service Provider Metadata

As requested, here is the metadata URL for configuring the IdP trust relationship:

**Metadata URL:** https://epsm.chalmers.se/saml/metadata/

The metadata is accessible via HTTPS and will update automatically if any SP configuration changes.

## Service Details

- **Entity ID:** https://epsm.chalmers.se/saml/metadata/
- **Assertion Consumer Service (ACS):** https://epsm.chalmers.se/saml/acs/
- **Single Logout Service (SLS):** https://epsm.chalmers.se/saml/sls/
- **Binding:** HTTP-POST for ACS, HTTP-Redirect for SLS
- **NameID Format:** urn:oasis:names:tc:SAML:2.0:nameid-format:persistent

## REFEDS Personalized Access Attributes

The service is configured to request the following REFEDS Personalized Access Entity Category attributes:

**Required Attributes:**
- `eduPersonPrincipalName` (urn:oid:1.3.6.1.4.1.5923.1.1.1.6) - Unique user identifier
- `mail` (urn:oid:0.9.2342.19200300.100.1.3) - Email address
- `givenName` (urn:oid:2.5.4.42) - First name
- `sn` (urn:oid:2.5.4.4) - Surname

**Optional Attributes:**
- `displayName` (urn:oid:2.16.840.1.113730.3.1.241) - Full display name
- `eduPersonScopedAffiliation` (urn:oid:1.3.6.1.4.1.5923.1.1.1.9) - Organizational affiliation
- `schacHomeOrganization` (urn:oid:1.3.6.1.4.1.25178.1.2.9) - Home organization identifier
- `eduPersonAssurance` (urn:oid:1.3.6.1.4.1.5923.1.1.1.11) - Identity assurance level
- `samlSubjectID` - SAML subject identifier

## Entity Category

The service declares the following entity category:
- **http://refeds.org/category/personalized** (REFEDS Personalized Access)

This indicates the service requires personalized access for authenticated users and will only release attributes according to REFEDS guidelines.

## Contact Information

**Technical Contact:**
- Name: Sanjay Somanath
- Email: sanjay.somanath@chalmers.se
- Organization: Chalmers University of Technology

**Administrative Contact:**
- Name: Alexander Hollberg
- Email: alexander.hollberg@chalmers.se
- Organization: Chalmers University of Technology

## Next Steps

Once the IdP trust relationship is configured:
1. I will test the SAML login flow with my Chalmers CID
2. Verify attribute release and user profile creation
3. Confirm the service is production-ready

Please let me know if you need any additional information or if there are specific configuration requirements from the IdP side.

Thank you for your assistance with the SAML integration!

Best regards,  
Sanjay Somanath  
Division of Building Technology  
Chalmers University of Technology

---

## Technical Notes (for reference)

- **Django SAML Framework:** djangosaml2 with pysaml2 backend
- **SSL/TLS:** Let's Encrypt certificate for epsm.chalmers.se
- **Signature Algorithm:** RSA-SHA256 (default)
- **Assertions:** WantAssertionsSigned=true
- **AuthnRequests:** AuthnRequestsSigned=false (can be enabled if required)
- **IdP Metadata URL:** (currently configured from environment variable)

The service follows SAML 2.0 specifications and REFEDS best practices for attribute handling and privacy protection.
