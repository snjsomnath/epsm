# PostgreSQL Database Client for Django Backend
# Django ORM database client
# Provides database operations through Django models

def check_material_exists(material_name: str) -> bool:
    """
    Check if a material exists in PostgreSQL using Django ORM.
    """
    try:
        from database.models import Material
        return Material.objects.filter(name__iexact=material_name).exists()
    except Exception as e:
        print(f"Error checking material in PostgreSQL: {e}")
        return False

def check_construction_exists(construction_name: str) -> bool:
    """
    Check if a construction exists in PostgreSQL using Django ORM.
    """
    try:
        from database.models import Construction
        return Construction.objects.filter(name__iexact=construction_name).exists()
    except Exception as e:
        print(f"Error checking construction in PostgreSQL: {e}")
        return False

def get_materials_count() -> int:
    """
    Get the total count of materials in PostgreSQL.
    """
    try:
        from database.models import Material
        return Material.objects.count()
    except Exception as e:
        print(f"Error getting materials count from PostgreSQL: {e}")
        return 0

def get_constructions_count() -> int:
    """
    Get the total count of constructions in PostgreSQL.
    """
    try:
        from database.models import Construction
        return Construction.objects.count()
    except Exception as e:
        print(f"Error getting constructions count from PostgreSQL: {e}")
        return 0