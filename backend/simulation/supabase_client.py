import os
from supabase import create_client, Client
from django.conf import settings

def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance.
    """
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_KEY
    
    if not url or not key:
        raise ValueError("Supabase URL and key must be configured in settings")
    
    return create_client(url, key)

def check_material_exists(material_name: str) -> bool:
    """
    Check if a material exists in Supabase.
    """
    try:
        supabase = get_supabase_client()
        response = supabase.table('materials').select('id').ilike('name', material_name).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"Error checking material in Supabase: {e}")
        return False

def check_construction_exists(construction_name: str) -> bool:
    """
    Check if a construction exists in Supabase.
    """
    try:
        supabase = get_supabase_client()
        response = supabase.table('constructions').select('id').ilike('name', construction_name).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"Error checking construction in Supabase: {e}")
        return False

def get_materials_count() -> int:
    """
    Get the total count of materials in Supabase.
    """
    try:
        supabase = get_supabase_client()
        response = supabase.table('materials').select('id', count='exact').execute()
        return response.count or 0
    except Exception as e:
        print(f"Error getting materials count from Supabase: {e}")
        return 0

def get_constructions_count() -> int:
    """
    Get the total count of constructions in Supabase.
    """
    try:
        supabase = get_supabase_client()
        response = supabase.table('constructions').select('id', count='exact').execute()
        return response.count or 0
    except Exception as e:
        print(f"Error getting constructions count from Supabase: {e}")
        return 0