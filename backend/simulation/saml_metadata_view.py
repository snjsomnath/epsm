"""
Custom SAML metadata view to fix certificate usage issues
Addresses Björn's feedback about 'use="signing"' limitation
"""
import re
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from saml2.metadata import create_metadata_string
from saml2.sigver import security_context
from config.settings.production import SAML_CONFIG


@csrf_exempt
def custom_metadata(request):
    """
    Custom metadata view that fixes the certificate usage issue.
    
    This view:
    1. Generates SAML metadata using pysaml2
    2. Modifies it to remove 'use="signing"' from KeyDescriptor
    3. Filters out SHA1 algorithms
    
    Addresses Björn's feedback:
    - Remove 'use="signing"' so certificate can be used for both signing and encryption
    - Reduce SHA1 algorithm advertisements
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info("Custom SAML metadata view called")
    
    try:
        # Generate metadata using djangosaml2's approach
        from djangosaml2.conf import get_config
        conf = get_config(None, request)
        
        # Generate metadata XML
        metadata_string = create_metadata_string(
            None,
            conf,
            4,  # valid_for in hours
            None,
            None,
            None,
            None,
            None
        ).decode('utf-8')
        
        original_xml = metadata_string
        
        # Fix 1: Remove 'use="signing"' and 'use="encryption"' from KeyDescriptor
        # This allows the certificate to be used for both signing and encryption
        metadata_string = re.sub(
            r'<(\w+:)?KeyDescriptor\s+use="(signing|encryption)"',
            r'<\1KeyDescriptor',
            metadata_string
        )
        
        # Fix 2: Remove SHA1 digest and signing methods
        sha1_patterns = [
            r'<(\w+:)?DigestMethod\s+Algorithm="http://www\.w3\.org/2000/09/xmldsig#sha1"\s*/?>',
            r'<(\w+:)?SigningMethod\s+Algorithm="http://www\.w3\.org/2000/09/xmldsig#[^"]*sha1[^"]*"\s*/?>',
            r'<(\w+:)?SigningMethod\s+Algorithm="http://www\.w3\.org/2001/04/xmldsig-more#[^"]*sha1[^"]*"\s*/?>',
            r'<(\w+:)?DigestMethod\s+Algorithm="http://www\.w3\.org/2001/04/xmlenc#ripemd160"\s*/?>',
            r'<(\w+:)?SigningMethod\s+Algorithm="http://www\.w3\.org/2001/04/xmldsig-more#rsa-ripemd160"\s*/?>',
        ]
        
        for pattern in sha1_patterns:
            metadata_string = re.sub(pattern, '', metadata_string)
        
        # Clean up extra whitespace
        metadata_string = re.sub(r'\n\s*\n', '\n', metadata_string)
        
        if metadata_string != original_xml:
            logger.info("SAML metadata was modified to fix certificate usage and remove SHA1")
        
        return HttpResponse(
            metadata_string,
            content_type='application/xml',
            headers={'Content-Disposition': 'inline; filename="metadata.xml"'}
        )
        
    except Exception as e:
        logger.error(f"Error generating custom SAML metadata: {e}")
        import traceback
        traceback.print_exc()
        return HttpResponse(
            f"Error generating metadata: {str(e)}",
            status=500
        )