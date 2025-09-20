from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from django.conf import settings
from django.conf.urls.static import static
from simulation import views as simulation_views
from simulation import auth_views
import json
from django.http import JsonResponse
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

urlpatterns = [
    path('', root_view),
    path('admin/', admin.site.urls),
    
    # Authentication endpoints
    path('api/auth/login/', auth_views.api_login, name='api_login'),
    path('api/auth/logout/', auth_views.api_logout, name='api_logout'),
    path('api/auth/user/', auth_views.api_user, name='api_user'),
    path('api/auth/csrf/', auth_views.csrf_token, name='csrf_token'),
    
    # Database API endpoints
    path('api/materials/', simulation_views.api_materials, name='api_materials'),
    path('api/constructions/', simulation_views.api_constructions, name='api_constructions'),
    path('api/construction-sets/', simulation_views.api_construction_sets, name='api_construction_sets'),
    
    # Direct endpoints
    path('api/parse/idf/', simulation_views.parse_idf, name='parse_idf'),
    path('api/components/add/', simulation_views.add_components, name='add_components'),
    
    # Include the simulation URLs under the api/simulation/ prefix
    path('api/simulation/', include('simulation.urls')),

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
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)