"""
Custom SAML views to enforce SHA256 signature algorithm
Overrides djangosaml2 views to ensure correct signing algorithm is used
"""

import logging
from django.conf import settings
from djangosaml2.views import LoginView as BaseLoginView, LogoutInitView as BaseLogoutInitView

logger = logging.getLogger(__name__)


class LoginView(BaseLoginView):
    """
    Custom SAML Login View that enforces SHA256 signature algorithm
    
    This overrides djangosaml2's LoginView to explicitly set signature and digest
    algorithms when creating AuthnRequest objects. Required for ADFS which mandates
    SHA256 and rejects SHA1.
    
    Error without this fix:
    MSIS7093: The message is not signed with expected signature algorithm. 
    Message is signed with signature algorithm http://www.w3.org/2000/09/xmldsig#rsa-sha1. 
    Expected signature algorithm http://www.w3.org/2001/04/xmldsig-more#rsa-sha256.
    """
    
    def get(self, request, *args, **kwargs):
        """Override GET to inject SHA256 signature algorithm into SAML config"""
        # Modify the SAML_CONFIG directly before the parent class uses it
        # This ensures SHA256 is used when creating the AuthnRequest
        if hasattr(settings, 'SAML_CONFIG'):
            # Force SHA256 at config root level
            settings.SAML_CONFIG['signing_algorithm'] = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
            settings.SAML_CONFIG['digest_algorithm'] = 'http://www.w3.org/2001/04/xmlenc#sha256'
            
            # Also set at SP service level for redundancy
            if 'service' in settings.SAML_CONFIG and 'sp' in settings.SAML_CONFIG['service']:
                settings.SAML_CONFIG['service']['sp']['signing_algorithm'] = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
                settings.SAML_CONFIG['service']['sp']['digest_algorithm'] = 'http://www.w3.org/2001/04/xmlenc#sha256'
            
            logger.info(
                "Enforcing SHA256 signature algorithm for SAML AuthnRequest: "
                "sign_alg=http://www.w3.org/2001/04/xmldsig-more#rsa-sha256, "
                "digest_alg=http://www.w3.org/2001/04/xmlenc#sha256"
            )
        
        # Continue with parent implementation
        return super().get(request, *args, **kwargs)


class LogoutInitView(BaseLogoutInitView):
    """
    Custom SAML Logout Init View that enforces SHA256 signature algorithm
    """
    
    def get(self, request, *args, **kwargs):
        """Override GET to inject SHA256 signature algorithm into SAML config"""
        # Modify the SAML_CONFIG directly before the parent class uses it
        if hasattr(settings, 'SAML_CONFIG'):
            settings.SAML_CONFIG['signing_algorithm'] = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
            settings.SAML_CONFIG['digest_algorithm'] = 'http://www.w3.org/2001/04/xmlenc#sha256'
            
            if 'service' in settings.SAML_CONFIG and 'sp' in settings.SAML_CONFIG['service']:
                settings.SAML_CONFIG['service']['sp']['signing_algorithm'] = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
                settings.SAML_CONFIG['service']['sp']['digest_algorithm'] = 'http://www.w3.org/2001/04/xmlenc#sha256'
            
            logger.info(
                "Enforcing SHA256 signature algorithm for SAML LogoutRequest: "
                "sign_alg=http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"
            )
        
        # Continue with parent implementation
        return super().get(request, *args, **kwargs)
