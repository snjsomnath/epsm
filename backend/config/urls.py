from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse, FileResponse, Http404, JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from simulation import views as simulation_views
from simulation import auth_views
import json
import os
import mimetypes
import datetime

def db_test_view():
    """Test database connectivity"""
    try:
        from django.db import connections
        from database.models import Construction, ConstructionSet
        
        # Test default database
        default_cursor = connections['default'].cursor()
        default_cursor.execute("SELECT 1")
        default_works = True
        
        # Test materials database with direct SQL
        try:
            materials_cursor = connections['materials_db'].cursor()
            materials_cursor.execute("SELECT COUNT(*) FROM materials")
            materials_count = materials_cursor.fetchone()[0]
            
            materials_cursor.execute("SELECT COUNT(*) FROM constructions")
            constructions_count_sql = materials_cursor.fetchone()[0]
            
            materials_cursor.execute("SELECT COUNT(*) FROM construction_sets")
            construction_sets_count_sql = materials_cursor.fetchone()[0]
            
            materials_works = True
        except Exception as e:
            materials_works = False
            materials_count = f"Error: {str(e)}"
            constructions_count_sql = f"Error: {str(e)}"
            construction_sets_count_sql = f"Error: {str(e)}"
        
        # Test ORM queries
        try:
            constructions_orm_default = Construction.objects.count()
            constructions_orm_materials = Construction.objects.using('materials_db').count()
            construction_sets_orm_default = ConstructionSet.objects.count()
            construction_sets_orm_materials = ConstructionSet.objects.using('materials_db').count()
        except Exception as e:
            constructions_orm_default = f"Error: {str(e)}"
            constructions_orm_materials = f"Error: {str(e)}"
            construction_sets_orm_default = f"Error: {str(e)}"
            construction_sets_orm_materials = f"Error: {str(e)}"
        
        return {
            'default_db_works': default_works,
            'materials_db_works': materials_works,
            'materials_count_sql': materials_count,
            'constructions_count_sql': constructions_count_sql,
            'construction_sets_count_sql': construction_sets_count_sql,
            'constructions_orm_default': constructions_orm_default,
            'constructions_orm_materials': constructions_orm_materials,
            'construction_sets_orm_default': construction_sets_orm_default,
            'construction_sets_orm_materials': construction_sets_orm_materials
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

urlpatterns = [
    path('', root_view),
    path('health/', health_view, name='health'),
    path('admin/', admin.site.urls),
    
    # Authentication endpoints
    path('api/auth/login/', auth_views.api_login, name='api_login'),
    path('api/auth/logout/', auth_views.api_logout, name='api_logout'),
    path('api/auth/user/', auth_views.api_user, name='api_user'),
    path('api/auth/users/', auth_views.api_users, name='api_users'),
    path('api/auth/users/<int:id>/', auth_views.api_user_detail, name='api_user_detail'),
    path('api/auth/csrf/', auth_views.csrf_token, name='csrf_token'),
    
    # Database API endpoints
    path('api/materials/', simulation_views.api_materials, name='api_materials'),
        path('api/constructions/', simulation_views.api_constructions_create, name='api_constructions_create'),
        path('api/constructions/<uuid:id>/', simulation_views.api_construction_detail, name='api_construction_detail'),
    path('api/construction-sets/', simulation_views.api_construction_sets, name='api_construction_sets'),
    path('api/construction-sets/<uuid:id>/', simulation_views.api_construction_set_detail, name='api_construction_set_detail'),
    path('api/scenarios/', simulation_views.api_scenarios, name='api_scenarios'),
    path('api/scenarios/<uuid:id>/', simulation_views.api_scenario_detail, name='api_scenario_detail'),
    path('api/window-glazing', simulation_views.api_window_glazing, name='api_window_glazing'),
    
    # Direct endpoints
    path('api/parse/idf/', simulation_views.parse_idf, name='parse_idf'),
    path('api/components/add/', simulation_views.add_components, name='add_components'),
    
    # Include the simulation URLs under the api/simulation/ prefix
    path('api/simulation/', include('simulation.urls')),

    # RESTful materials API (v2)
    path('api/v2/', include('database.urls')),

    # Add a test endpoint for diagnostics
    path('api/test/', lambda request: JsonResponse({
        'status': 'ok', 
        'message': 'API test endpoint working',
        'time': str(datetime.datetime.now())
    })),
    
    # Add database connectivity test endpoint
    path('api/db-test/', lambda request: JsonResponse(db_test_view())),
]

# Add this if not already present
if settings.DEBUG:
    # Serve simulation result HTML requests that may be generated as .htm
    # (EnergyPlus outputs `output.htm` but frontend may request `output.html`).
    # This fallback will return the .htm file when an .html path is requested.
    def media_html_fallback(request, path):
        # Only handle simulation_results paths; otherwise let static handler manage.
        if not path.startswith('simulation_results/'):
            raise Http404

        full_path = os.path.join(settings.MEDIA_ROOT, path)
        if os.path.exists(full_path):
            content_type = mimetypes.guess_type(full_path)[0] or 'application/octet-stream'
            return FileResponse(open(full_path, 'rb'), content_type=content_type)

        # If an HTML was requested but only .htm exists, serve the .htm
        if path.endswith('.html'):
            alt = path[:-5] + '.htm'
            alt_full = os.path.join(settings.MEDIA_ROOT, alt)
            if os.path.exists(alt_full):
                return FileResponse(open(alt_full, 'rb'), content_type='text/html')

        raise Http404

    urlpatterns += [
        path('media/<path:path>', media_html_fallback),
    ]

    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)