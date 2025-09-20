#!/usr/bin/env python3
"""
Direct PostgreSQL API for materials data
Bypasses Django ORM to test dual database concept
"""
import psycopg2
import json
import os
from flask import Flask, jsonify

app = Flask(__name__)

# Local PostgreSQL connection (where materials data exists)
MATERIALS_DB_CONFIG = {
    'host': 'localhost',
    'database': 'epsm_local', 
    'user': 'ssanjay',
    'password': '',
    'port': 5432
}

def get_materials_connection():
    """Get connection to local PostgreSQL with materials data"""
    return psycopg2.connect(**MATERIALS_DB_CONFIG)

@app.route('/api/materials/', methods=['GET'])
def get_materials():
    """Get all materials from local database"""
    try:
        with get_materials_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT id, name, roughness, thickness_m, conductivity_w_mk, 
                           density_kg_m3, specific_heat_j_kgk, thermal_absorptance,
                           solar_absorptance, visible_absorptance, gwp_kgco2e_per_m2,
                           cost_sek_per_m2, wall_allowed, roof_allowed, floor_allowed,
                           window_layer_allowed, source
                    FROM materials
                    ORDER BY name
                """)
                
                columns = [desc[0] for desc in cursor.description]
                materials = []
                
                for row in cursor.fetchall():
                    material = dict(zip(columns, row))
                    # Convert UUID to string for JSON serialization
                    material['id'] = str(material['id'])
                    materials.append(material)
                
                return jsonify(materials)
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/constructions/', methods=['GET'])
def get_constructions():
    """Get all constructions from local database"""
    try:
        with get_materials_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT id, name, element_type, is_window, ep_construction_name,
                           u_value_w_m2k, gwp_kgco2e_per_m2, cost_sek_per_m2, source
                    FROM constructions
                    ORDER BY name
                """)
                
                columns = [desc[0] for desc in cursor.description]
                constructions = []
                
                for row in cursor.fetchall():
                    construction = dict(zip(columns, row))
                    # Convert UUID to string for JSON serialization
                    construction['id'] = str(construction['id'])
                    constructions.append(construction)
                
                return jsonify(constructions)
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/test/', methods=['GET'])
def test_endpoint():
    """Test endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'Direct Materials API working',
        'database': 'epsm_local (local PostgreSQL)'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001, debug=True)