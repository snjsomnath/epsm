"""
Privacy Policy view for EPSM
Serves the privacy policy required for REFEDS Personalized Access compliance
"""
from django.shortcuts import render
from django.views.decorators.cache import cache_page
from django.http import HttpResponse
import markdown
import os


@cache_page(60 * 60)  # Cache for 1 hour
def privacy_policy_view(request):
    """
    Render the privacy policy page
    
    Returns HTML view of the privacy policy for REFEDS Personalized Access compliance
    """
    context = {
        'title': 'Privacy Policy',
        'last_updated': '7 October 2025',
        'service_url': 'https://epsm.chalmers.se',
        'contact_email': 'sanjay.somanath@chalmers.se',
    }
    
    return render(request, 'privacy_policy.html', context)


def privacy_policy_markdown(request):
    """
    Serve the privacy policy as Markdown (for documentation)
    """
    # Path to the privacy policy markdown file
    policy_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        'docs',
        'PRIVACY_POLICY.md'
    )
    
    try:
        with open(policy_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Convert Markdown to HTML
        html_content = markdown.markdown(
            content,
            extensions=['tables', 'fenced_code']
        )
        
        return HttpResponse(html_content, content_type='text/html')
    except FileNotFoundError:
        return HttpResponse(
            '<h1>Privacy Policy Not Found</h1><p>The privacy policy document is being prepared.</p>',
            status=404
        )
