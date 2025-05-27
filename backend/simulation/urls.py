from django.urls import path
from . import views

urlpatterns = [
    # ...existing code...
    path('parse/idf/', views.parse_idf, name='parse_idf'),
    # ...existing code...
]