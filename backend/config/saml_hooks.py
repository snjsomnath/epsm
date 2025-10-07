"""
SAML attribute mapping hooks for Chalmers SSO integration
Handles custom user creation and attribute updates
"""
import logging

logger = logging.getLogger(__name__)


def custom_update_user(user, attributes, attribute_mapping):
    """
    Custom callback to update Django user from Chalmers SAML attributes
    Implements REFEDS Personalized Access Entity Category attribute mapping
    
    REFEDS Personalized Access attributes from Chalmers IdP:
    - samlSubjectID or eduPersonPrincipalName: Unique persistent identifier
    - mail: Email address (urn:oid:0.9.2342.19200300.100.1.3)
    - displayName: Full name (urn:oid:2.16.840.1.113730.3.1.241)
    - givenName: First name (urn:oid:2.5.4.42)
    - sn: Last name/surname (urn:oid:2.5.4.4)
    - eduPersonScopedAffiliation: Organizational role (urn:oid:1.3.6.1.4.1.5923.1.1.1.9)
    - schacHomeOrganization: Home organization (urn:oid:1.3.6.1.4.1.25178.1.2.9)
    - eduPersonAssurance: Identity assurance level (urn:oid:1.3.6.1.4.1.5923.1.1.1.11)
    
    Args:
        user: Django User instance
        attributes: Dict of SAML attributes from Chalmers IdP
        attribute_mapping: Django field mapping configuration
    
    Returns:
        bool: True if user was updated
    """
    updated = False
    
    # Extract unique identifier for username
    # Priority: eduPersonPrincipalName > samlSubjectID > uid (for backward compatibility)
    username = None
    if 'eduPersonPrincipalName' in attributes and attributes['eduPersonPrincipalName']:
        # Format: ssanjay@chalmers.se -> extract 'ssanjay'
        eppn = attributes['eduPersonPrincipalName'][0]
        username = eppn.split('@')[0] if '@' in eppn else eppn
        logger.debug(f"Using eduPersonPrincipalName: {eppn} -> username: {username}")
    elif 'samlSubjectID' in attributes and attributes['samlSubjectID']:
        # Format: ssanjay@chalmers.se -> extract 'ssanjay'
        subject_id = attributes['samlSubjectID'][0]
        username = subject_id.split('@')[0] if '@' in subject_id else subject_id
        logger.debug(f"Using samlSubjectID: {subject_id} -> username: {username}")
    elif 'uid' in attributes and attributes['uid']:
        # Fallback for backward compatibility
        username = attributes['uid'][0]
        logger.debug(f"Using uid (fallback): {username}")
    
    if username and user.username != username:
        logger.info(f"Setting username: {username}")
        user.username = username
        updated = True
    
    # Extract email
    if 'mail' in attributes and attributes['mail']:
        email = attributes['mail'][0]
        if user.email != email:
            logger.info(f"Setting email: {email}")
            user.email = email
            updated = True
    
    # Extract name information
    # displayName takes precedence, otherwise use givenName + sn
    if 'displayName' in attributes and attributes['displayName']:
        full_name = attributes['displayName'][0]
        # Split displayName into first and last name
        name_parts = full_name.split(' ', 1)
        first_name = name_parts[0] if len(name_parts) > 0 else ''
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        if user.first_name != first_name:
            user.first_name = first_name
            updated = True
        if user.last_name != last_name:
            user.last_name = last_name
            updated = True
    else:
        # Fallback to givenName and sn
        if 'givenName' in attributes and attributes['givenName']:
            first_name = attributes['givenName'][0]
            if user.first_name != first_name:
                user.first_name = first_name
                updated = True
        
        if 'sn' in attributes and attributes['sn']:
            last_name = attributes['sn'][0]
            if user.last_name != last_name:
                user.last_name = last_name
                updated = True
    
    # Check affiliation for staff/superuser status
    # Use eduPersonScopedAffiliation (REFEDS standard) with fallback to eduPersonAffiliation
    affiliations = []
    if 'eduPersonScopedAffiliation' in attributes and attributes['eduPersonScopedAffiliation']:
        # Format: 'staff@chalmers.se', 'employee@chalmers.se', etc.
        affiliations = [aff.split('@')[0] for aff in attributes['eduPersonScopedAffiliation']]
        logger.debug(f"eduPersonScopedAffiliation: {affiliations}")
    elif 'eduPersonAffiliation' in attributes and attributes['eduPersonAffiliation']:
        affiliations = attributes['eduPersonAffiliation']
        logger.debug(f"eduPersonAffiliation (fallback): {affiliations}")
    
    if affiliations:
        # Staff, faculty, and employees get staff access
        if any(aff in ['employee', 'faculty', 'staff', 'member'] for aff in affiliations):
            if not user.is_staff:
                logger.info(f"Granting staff access to {user.username} (affiliation: {affiliations})")
                user.is_staff = True
                updated = True
        
        # Only specific usernames get superuser (configure as needed)
        # Add your username and other admins here
        superuser_usernames = ['ssanjay', 'hollberg','vasnas']  # Example usernames
        if user.username in superuser_usernames and not user.is_superuser:
            logger.info(f"Granting superuser access to {user.username}")
            user.is_superuser = True
            updated = True
    
    # Ensure user is active
    if not user.is_active:
        logger.info(f"Activating user {user.username}")
        user.is_active = True
        updated = True
    
    if updated:
        user.save()
        logger.info(f"Updated user: {user.username} ({user.email})")
    
    return updated
