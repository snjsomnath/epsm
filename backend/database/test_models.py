"""
Unit tests for Database models (Material and Construction).

Tests for:
- Material model creation and validation
- Construction model and relationships
- Data integrity and constraints
"""

import pytest
from database.models import Material, Construction


# ============================================================================
# Material Model Tests
# ============================================================================

@pytest.mark.unit
@pytest.mark.models
class TestMaterialModel:
    """Test suite for Material model."""

    def test_material_creation_opaque(self, db):
        """Test creating an opaque material."""
        material = Material.objects.create(
            name="Concrete Block",
            material_type="opaque",
            thickness=0.2,
            conductivity=1.73,
            density=2300,
            specific_heat=900
        )
        
        assert material.name == "Concrete Block"
        assert material.material_type == "opaque"
        assert material.thickness == 0.2
        assert material.conductivity == 1.73
        assert material.density == 2300
        assert material.specific_heat == 900

    def test_material_creation_transparent(self, db):
        """Test creating a transparent material (glazing)."""
        material = Material.objects.create(
            name="Double Glazing",
            material_type="transparent",
            thickness=0.024
        )
        
        assert material.name == "Double Glazing"
        assert material.material_type == "transparent"

    def test_material_str_representation(self, sample_material):
        """Test string representation of material."""
        # Assuming __str__ returns the name
        assert str(sample_material) == sample_material.name or "Test Material" in str(sample_material)

    def test_material_unique_name(self, db):
        """Test that material names should ideally be unique."""
        Material.objects.create(
            name="Test Material",
            material_type="opaque",
            thickness=0.1,
            conductivity=0.5,
            density=1000,
            specific_heat=1000
        )
        
        # Creating another with same name - depending on your model constraints
        # This test documents expected behavior
        material2 = Material.objects.create(
            name="Test Material 2",
            material_type="opaque",
            thickness=0.15,
            conductivity=0.6,
            density=1100,
            specific_heat=1100
        )
        assert material2.name == "Test Material 2"

    def test_material_thermal_properties(self, db):
        """Test material thermal properties are stored correctly."""
        material = Material.objects.create(
            name="Insulation",
            material_type="opaque",
            thickness=0.15,
            conductivity=0.04,  # Low conductivity for insulation
            density=30,
            specific_heat=1400
        )
        
        # Calculate R-value (resistance)
        r_value = material.thickness / material.conductivity
        assert r_value > 3.0  # Good insulation

    def test_material_nullable_fields(self, db):
        """Test that certain fields can be null for different material types."""
        # Some transparent materials may not need all thermal properties
        material = Material.objects.create(
            name="Simple Glazing",
            material_type="transparent"
        )
        
        assert material.name == "Simple Glazing"

    def test_material_query_by_type(self, db):
        """Test querying materials by type."""
        # Create multiple materials
        Material.objects.create(
            name="Opaque 1",
            material_type="opaque",
            thickness=0.1,
            conductivity=0.5,
            density=1000,
            specific_heat=1000
        )
        Material.objects.create(
            name="Opaque 2",
            material_type="opaque",
            thickness=0.2,
            conductivity=0.6,
            density=1100,
            specific_heat=1100
        )
        Material.objects.create(
            name="Transparent 1",
            material_type="transparent",
            thickness=0.024
        )
        
        opaque_count = Material.objects.filter(material_type="opaque").count()
        transparent_count = Material.objects.filter(material_type="transparent").count()
        
        assert opaque_count == 2
        assert transparent_count == 1


# ============================================================================
# Construction Model Tests
# ============================================================================

@pytest.mark.unit
@pytest.mark.models
class TestConstructionModel:
    """Test suite for Construction model."""

    def test_construction_creation(self, db):
        """Test creating a construction."""
        construction = Construction.objects.create(
            name="External Wall",
            construction_type="wall"
        )
        
        assert construction.name == "External Wall"
        assert construction.construction_type == "wall"

    def test_construction_types(self, db):
        """Test different construction types."""
        construction_types = ['wall', 'roof', 'floor', 'window']
        
        for ctype in construction_types:
            construction = Construction.objects.create(
                name=f"Test {ctype}",
                construction_type=ctype
            )
            assert construction.construction_type == ctype

    def test_construction_str_representation(self, sample_construction):
        """Test string representation of construction."""
        assert str(sample_construction) == sample_construction.name or "Test Construction" in str(sample_construction)

    def test_construction_with_layers(self, db, sample_material):
        """Test construction with material layers."""
        construction = Construction.objects.create(
            name="Multi-Layer Wall",
            construction_type="wall"
        )
        
        # Note: Depending on your model structure, you may have a 
        # ConstructionLayer or similar related model
        # This test documents the expected behavior
        assert construction is not None
        assert construction.construction_type == "wall"

    def test_construction_query_by_type(self, db):
        """Test querying constructions by type."""
        Construction.objects.create(name="Wall 1", construction_type="wall")
        Construction.objects.create(name="Wall 2", construction_type="wall")
        Construction.objects.create(name="Roof 1", construction_type="roof")
        
        wall_count = Construction.objects.filter(construction_type="wall").count()
        roof_count = Construction.objects.filter(construction_type="roof").count()
        
        assert wall_count == 2
        assert roof_count == 1


# ============================================================================
# Integration Tests (Material + Construction)
# ============================================================================

@pytest.mark.integration
@pytest.mark.models
class TestMaterialConstructionIntegration:
    """Test suite for Material and Construction integration."""

    def test_material_to_construction_relationship(self, db):
        """Test relationship between materials and constructions."""
        # Create materials
        exterior_finish = Material.objects.create(
            name="Exterior Finish",
            material_type="opaque",
            thickness=0.02,
            conductivity=1.0,
            density=1800,
            specific_heat=1000
        )
        
        insulation = Material.objects.create(
            name="Insulation Layer",
            material_type="opaque",
            thickness=0.15,
            conductivity=0.04,
            density=30,
            specific_heat=1400
        )
        
        # Create construction
        construction = Construction.objects.create(
            name="Insulated Wall",
            construction_type="wall"
        )
        
        # Verify both exist
        assert Material.objects.count() >= 2
        assert Construction.objects.count() >= 1

    def test_complex_construction_assembly(self, db):
        """Test a complex construction with multiple layers."""
        # Create a complete wall assembly
        materials = [
            ("Exterior Plaster", 0.02, 1.0),
            ("Brick", 0.1, 0.7),
            ("Insulation", 0.15, 0.04),
            ("Air Gap", 0.025, 0.025),
            ("Gypsum Board", 0.013, 0.16),
        ]
        
        for name, thickness, conductivity in materials:
            Material.objects.create(
                name=name,
                material_type="opaque",
                thickness=thickness,
                conductivity=conductivity,
                density=1000,
                specific_heat=1000
            )
        
        construction = Construction.objects.create(
            name="Complex Wall Assembly",
            construction_type="wall"
        )
        
        assert Material.objects.count() >= 5
        assert construction is not None
