```python
from django.contrib import admin
from django.urls import path
from simulation import views as simulation_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/parse/idf/', simulation_views.parse_idf, name='parse_idf'),
    path('api/components/add/', simulation_views.add_components, name='add_components'),
]
```