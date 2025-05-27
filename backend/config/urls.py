from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from django.conf import settings
from django.conf.urls.static import static
from simulation import views as simulation_views

def root_view(request):
    return HttpResponse("Welcome to the EPSM API.")

urlpatterns = [
    path('', root_view),
    path('admin/', admin.site.urls),
    # Direct endpoints
    path('api/parse/idf/', simulation_views.parse_idf, name='parse_idf'),
    path('api/components/add/', simulation_views.add_components, name='add_components'),
    
    # Include the simulation URLs under the api/simulation/ prefix
    path('api/simulation/', include('simulation.urls')),
]

# Add this if not already present
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)