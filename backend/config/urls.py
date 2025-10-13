from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse, FileResponse, Http404, JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from simulation import views as simulation_views
from simulation import auth_views
from simulation import privacy_views
import json
import os
import mimetypes
import datetime

def db_test_view():
    """Test database connectivity and count records"""
    try:
        from django.db import connections
        from database.models import Construction, ConstructionSet, Material
        
        # Test default database
        cursor = connections['default'].cursor()
        cursor.execute("SELECT 1")
        db_works = True
        
        # Count records using direct SQL
        cursor.execute("SELECT COUNT(*) FROM materials")
        materials_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM constructions")
        constructions_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM construction_sets")
        construction_sets_count = cursor.fetchone()[0]
        
        # Test ORM queries
        materials_orm = Material.objects.count()
        constructions_orm = Construction.objects.count()
        construction_sets_orm = ConstructionSet.objects.count()
        
        return {
            'database_works': db_works,
            'materials_count_sql': materials_count,
            'constructions_count_sql': constructions_count,
            'construction_sets_count_sql': construction_sets_count,
            'materials_count_orm': materials_orm,
            'constructions_count_orm': constructions_orm,
            'construction_sets_count_orm': construction_sets_orm,
        }
        
    except Exception as e:
        return {
            'error': str(e)
        }

def root_view(request):
    """Root view for the API with diagnostics."""
    from django.http import JsonResponse
    import datetime
    
    # Include available endpoints for debugging
    available_endpoints = [
        '/api/simulation/system-resources/',
        '/api/parse/idf/',
        '/api/components/add/',
        '/api/simulation/run/',
    ]
    
    return JsonResponse({
        'status': 'ok',
        'message': 'Welcome to the EPSM API.',
        'time': str(datetime.datetime.now()),
        'available_endpoints': available_endpoints
    })

def health_view(request):
    """Health check endpoint for Docker healthcheck."""
    from django.http import JsonResponse
    from django.db import connections
    
    # Check database connectivity
    try:
        connections['default'].cursor().execute("SELECT 1")
        db_status = 'healthy'
    except Exception as e:
        db_status = f'unhealthy: {str(e)}'
    
    return JsonResponse({
        'status': 'healthy',
        'database': db_status
    })

def version_view(request):
    """Return version and application information."""
    from django.http import JsonResponse
    from __version__ import (
        __version__, VERSION_INFO, APP_NAME, APP_ACRONYM, 
        APP_DESCRIPTION, APP_AUTHOR, APP_AUTHOR_EMAIL,
        APP_INSTITUTION, APP_LICENSE, APP_URL
    )
    
    return JsonResponse({
        'version': __version__,
        'version_info': VERSION_INFO,
        'app_name': APP_NAME,
        'app_acronym': APP_ACRONYM,
        'description': APP_DESCRIPTION,
        'author': APP_AUTHOR,
        'author_email': APP_AUTHOR_EMAIL,
        'institution': APP_INSTITUTION,
        'license': APP_LICENSE,
        'url': APP_URL,
    })

urlpatterns = [
    path('', root_view),
    path('health/', health_view, name='health'),
    path('api/version/', version_view, name='version'),
    path('admin/', admin.site.urls),
    
    # Authentication endpoints
    path('api/auth/login/', auth_views.api_login, name='api_login'),
    path('api/auth/logout/', auth_views.api_logout, name='api_logout'),
    path('api/auth/user/', auth_views.api_user, name='api_user'),
    path('api/auth/users/', auth_views.api_users, name='api_users'),
    path('api/auth/users/<int:id>/', auth_views.api_user_detail, name='api_user_detail'),
    path('api/auth/csrf/', auth_views.csrf_token, name='csrf_token'),
    
    # SAML SSO endpoints (production)
    path('api/auth/login-info/', auth_views.login_info, name='login_info'),
    path('api/auth/current-user/', auth_views.current_user, name='current_user'),
    path('api/auth/local-login/', auth_views.local_login, name='local_login'),
    path('api/auth/logout-view/', auth_views.logout_view, name='logout_view'),
    
    # Database API endpoints
    path('api/materials/', simulation_views.api_materials, name='api_materials'),
        path('api/constructions/', simulation_views.api_constructions_create, name='api_constructions_create'),
        path('api/constructions/<uuid:id>/', simulation_views.api_construction_detail, name='api_construction_detail'),
    path('api/construction-sets/', simulation_views.api_construction_sets, name='api_construction_sets'),
    path('api/construction-sets/<uuid:id>/', simulation_views.api_construction_set_detail, name='api_construction_set_detail'),
    path('api/scenarios/', simulation_views.api_scenarios, name='api_scenarios'),
    path('api/scenarios/<uuid:id>/', simulation_views.api_scenario_detail, name='api_scenario_detail'),
    path('api/window-glazing/', simulation_views.api_window_glazing, name='api_window_glazing'),
    
    # Direct endpoints
    path('api/parse/idf/', simulation_views.parse_idf, name='parse_idf'),
    path('api/components/add/', simulation_views.add_components, name='add_components'),
    
    # Include the simulation URLs under the api/simulation/ prefix
    path('api/simulation/', include('simulation.urls')),

    # RESTful materials API (v2)
    path('api/v2/', include('database.urls')),
    
    # GeoJSON Processor API
    path('api/geojson/', include('geojson_processor.urls')),

    # Add a test endpoint for diagnostics
    path('api/test/', lambda request: JsonResponse({
        'status': 'ok', 
        'message': 'API test endpoint working',
        'time': str(datetime.datetime.now())
    })),
    
    # Add database connectivity test endpoint
    path('api/db-test/', lambda request: JsonResponse(db_test_view())),
    
    # Privacy Policy (required for REFEDS Personalized Access compliance)
    path('privacy/', privacy_views.privacy_policy_view, name='privacy_policy'),
    path('privacy.md', privacy_views.privacy_policy_markdown, name='privacy_policy_markdown'),
]

# Add SAML SSO endpoints in production
if not settings.DEBUG:
    from simulation.saml_metadata_view import custom_metadata
    from djangosaml2 import views as saml2_views
    
    # Custom SAML URLs with our metadata view override
    saml_urlpatterns = [
        # Custom metadata endpoint (must be BEFORE include to override)
        path('saml/metadata/', custom_metadata, name='saml2_metadata'),
        # ACS (Assertion Consumer Service)
        path('saml/acs/', saml2_views.AssertionConsumerServiceView.as_view(), name='saml2_acs'),
        # SLS (Single Logout Service)  
        path('saml/sls/', saml2_views.LogoutView.as_view(), name='saml2_ls'),
        # Login
        path('saml/login/', saml2_views.LoginView.as_view(), name='saml2_login'),
        # Logout
        path('saml/logout/', saml2_views.LogoutInitView.as_view(), name='saml2_logout'),
    ]
    
    urlpatterns += saml_urlpatterns

# Add this if not already present
if settings.DEBUG:
    # Serve all media files in production
    # Also handles simulation result HTML requests that may be generated as .htm
    # (EnergyPlus outputs `output.htm` but frontend may request `output.html`).
    def media_file_handler(request, path):
        full_path = os.path.join(settings.MEDIA_ROOT, path)
        if os.path.exists(full_path):
            content_type = mimetypes.guess_type(full_path)[0] or 'application/octet-stream'
            return FileResponse(open(full_path, 'rb'), content_type=content_type)

        # Special handling: If an HTML was requested but only .htm exists, serve the .htm
        # (This is specific to simulation_results where EnergyPlus generates .htm files)
        if path.startswith('simulation_results/') and path.endswith('.html'):
            alt = path[:-5] + '.htm'
            alt_full = os.path.join(settings.MEDIA_ROOT, alt)
            if os.path.exists(alt_full):
                return FileResponse(open(alt_full, 'rb'), content_type='text/html')

        raise Http404

    urlpatterns += [
        path('media/<path:path>', media_file_handler),
    ]