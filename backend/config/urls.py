from django.contrib import admin
from django.urls import path
from django.http import HttpResponse
from simulation import views as simulation_views

def root_view(request):
    return HttpResponse("Welcome to the EPSM API.")

urlpatterns = [
    path('', root_view),
    path('admin/', admin.site.urls),
    path('api/parse/idf/', simulation_views.parse_idf, name='parse_idf'),
    path('api/components/add/', simulation_views.add_components, name='add_components'),
]