#!/usr/bin/env python3
"""
Supabase Database Export Script
Exports schema and data from Supabase to local files for PostgreSQL migration
"""

import os
import json
import subprocess
from urllib.parse import urlparse
from datetime import datetime

# Supabase connection details
SUPABASE_URL = "https://jekcbvnxzaykttmrmfgb.supabase.co"
PROJECT_REF = "jekcbvnxzaykttmrmfgb"

def get_database_url():
    """
    Construct the PostgreSQL connection URL for Supabase
    You'll need to provide your database password
    """
    password = input("Enter your Supabase database password: ")
    return f"postgresql://postgres.jekcbvnxzaykttmrmfgb:{password}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

def export_schema_and_data():
    """
    Export complete schema and data using pg_dump
    """
    db_url = get_database_url()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create exports directory
    export_dir = "database_exports"
    os.makedirs(export_dir, exist_ok=True)
    
    # Export complete database (schema + data)
    complete_dump = f"{export_dir}/supabase_complete_{timestamp}.sql"
    print(f"Exporting complete database to {complete_dump}...")
    
    try:
        subprocess.run([
            "pg_dump",
            db_url,
            "--verbose",
            "--clean",
            "--no-owner",
            "--no-privileges",
            "--exclude-schema=auth",
            "--exclude-schema=storage", 
            "--exclude-schema=realtime",
            "--exclude-schema=supabase_functions",
            "--exclude-schema=extensions",
            "--exclude-schema=graphql",
            "--exclude-schema=graphql_public",
            "--exclude-schema=pgbouncer",
            "--exclude-schema=pgsodium",
            "--exclude-schema=pgsodium_masks",
            "--exclude-schema=realtime",
            "--exclude-schema=supabase_migrations",
            "--exclude-schema=vault",
            "-f", complete_dump
        ], check=True)
        print(f"✅ Complete database exported to {complete_dump}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error exporting database: {e}")
        return None
    
    # Export schema only
    schema_dump = f"{export_dir}/supabase_schema_{timestamp}.sql"
    print(f"Exporting schema only to {schema_dump}...")
    
    try:
        subprocess.run([
            "pg_dump",
            db_url,
            "--schema-only",
            "--verbose",
            "--clean",
            "--no-owner",
            "--no-privileges",
            "--exclude-schema=auth",
            "--exclude-schema=storage",
            "--exclude-schema=realtime",
            "--exclude-schema=supabase_functions",
            "--exclude-schema=extensions",
            "--exclude-schema=graphql",
            "--exclude-schema=graphql_public",
            "--exclude-schema=pgbouncer",
            "--exclude-schema=pgsodium",
            "--exclude-schema=pgsodium_masks",
            "--exclude-schema=realtime",
            "--exclude-schema=supabase_migrations",
            "--exclude-schema=vault",
            "-f", schema_dump
        ], check=True)
        print(f"✅ Schema exported to {schema_dump}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error exporting schema: {e}")
    
    # Export data only 
    data_dump = f"{export_dir}/supabase_data_{timestamp}.sql"
    print(f"Exporting data only to {data_dump}...")
    
    try:
        subprocess.run([
            "pg_dump",
            db_url,
            "--data-only",
            "--verbose",
            "--no-owner",
            "--no-privileges",
            "--exclude-schema=auth",
            "--exclude-schema=storage",
            "--exclude-schema=realtime",
            "--exclude-schema=supabase_functions",
            "--exclude-schema=extensions",
            "--exclude-schema=graphql",
            "--exclude-schema=graphql_public",
            "--exclude-schema=pgbouncer",
            "--exclude-schema=pgsodium",
            "--exclude-schema=pgsodium_masks",
            "--exclude-schema=realtime",
            "--exclude-schema=supabase_migrations",
            "--exclude-schema=vault",
            "-f", data_dump
        ], check=True)
        print(f"✅ Data exported to {data_dump}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error exporting data: {e}")
    
    return complete_dump

def export_table_list():
    """
    Create a list of all tables for reference
    """
    print("\nCreating table list...")
    
    tables = [
        "materials",
        "window_glazing", 
        "constructions",
        "layers",
        "construction_sets",
        "scenarios",
        "scenario_constructions",
        "user_profiles",
        "user_preferences",
        "user_sessions",
        "simulation_runs",
        "baseline_results",
        "scenario_results",
        "simulation_files",
        "allowed_emails",
        "allowed_email_domains"
    ]
    
    export_dir = "database_exports"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    table_info = {
        "export_timestamp": timestamp,
        "source_project": PROJECT_REF,
        "source_url": SUPABASE_URL,
        "tables": tables,
        "notes": [
            "This export excludes Supabase internal schemas (auth, storage, etc.)",
            "Row Level Security policies will need to be recreated",
            "Triggers and functions may need manual migration",
            "User authentication data is not included (auth schema excluded)"
        ]
    }
    
    with open(f"{export_dir}/export_info_{timestamp}.json", "w") as f:
        json.dump(table_info, f, indent=2)
    
    print(f"✅ Table information saved to export_info_{timestamp}.json")

if __name__ == "__main__":
    print("🚀 Starting Supabase Database Export")
    print("=" * 50)
    
    # Check if pg_dump is available
    try:
        subprocess.run(["pg_dump", "--version"], check=True, capture_output=True)
    except subprocess.CalledProcessError:
        print("❌ pg_dump not found. Please install PostgreSQL client tools:")
        print("   brew install postgresql")
        exit(1)
    
    print(f"📊 Exporting from project: {PROJECT_REF}")
    print(f"🔗 Source URL: {SUPABASE_URL}")
    print()
    
    # Export database
    complete_dump = export_schema_and_data()
    
    # Export table information
    export_table_list()
    
    if complete_dump:
        print("\n🎉 Export completed successfully!")
        print(f"📁 Check the 'database_exports' directory for all exported files")
        print("\nNext steps:")
        print("1. Install PostgreSQL locally")
        print("2. Create a new database")
        print("3. Import the schema and data")
        print("4. Update application configuration")
    else:
        print("\n❌ Export failed. Please check your database credentials and connection.")