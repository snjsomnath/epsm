"""
SAML attribute mapping hooks for Chalmers SSO integration
Handles custom user creation and attribute updates
"""
import logging

logger = logging.getLogger(__name__)


def custom_update_user(user, attributes, attribute_mapping):
    """
    Custom callback to update Django user from Chalmers SAML attributes
    
    Chalmers provides:
    - uid: CID (e.g., 'ssanjay')
    - mail: Email (e.g., 'ssanjay@chalmers.se')
    - givenName: First name
    - sn: Last name (surname)
    - eduPersonAffiliation: Role (e.g., 'employee', 'student')
    
    Args:
        user: Django User instance
        attributes: Dict of SAML attributes from Chalmers IdP
        attribute_mapping: Django field mapping configuration
    
    Returns:
        bool: True if user was updated
    """
    updated = False
    
    # Extract Chalmers CID (username)
    if 'uid' in attributes and attributes['uid']:
        cid = attributes['uid'][0]
        if user.username != cid:
            logger.info(f"Setting username to CID: {cid}")
            user.username = cid
            updated = True
    
    # Extract email
    if 'mail' in attributes and attributes['mail']:
        email = attributes['mail'][0]
        if user.email != email:
            logger.info(f"Setting email: {email}")
            user.email = email
            updated = True
    
    # Extract first name
    if 'givenName' in attributes and attributes['givenName']:
        first_name = attributes['givenName'][0]
        if user.first_name != first_name:
            user.first_name = first_name
            updated = True
    
    # Extract last name
    if 'sn' in attributes and attributes['sn']:
        last_name = attributes['sn'][0]
        if user.last_name != last_name:
            user.last_name = last_name
            updated = True
    
    # Check affiliation for staff/superuser status
    if 'eduPersonAffiliation' in attributes and attributes['eduPersonAffiliation']:
        affiliations = attributes['eduPersonAffiliation']
        
        # Staff and faculty get staff access
        if any(aff in ['employee', 'faculty', 'staff'] for aff in affiliations):
            if not user.is_staff:
                logger.info(f"Granting staff access to {user.username}")
                user.is_staff = True
                updated = True
        
        # Only specific CIDs get superuser (configure as needed)
        # Add your CID and other admins here
        superuser_cids = ['ssanjay', 'hollberg']  # Example CIDs
        if user.username in superuser_cids and not user.is_superuser:
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
