from rest_framework import serializers
from .models import Material


class MaterialSerializer(serializers.ModelSerializer):
    def validate_roughness(self, value):
        # If roughness is None or empty, use default
        if not value:
            return 'MediumRough'  # Default value
        return value

    class Meta:
        model = Material
        fields = '__all__'
