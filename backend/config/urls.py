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
]

# Add this if not already present
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)