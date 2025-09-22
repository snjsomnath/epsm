from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from database.models import Material
from database.serializers import MaterialSerializer

class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'id'
