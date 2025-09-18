#!/bin/bash

# Supabase Direct Database Connection Test
# This script helps identify the correct connection format

set -e

PROJECT_REF="jekcbvnxzaykttmrmfgb"
echo "🔍 Testing Supabase database connection formats..."
echo "Project Reference: ${PROJECT_REF}"
echo

# Add PostgreSQL to PATH
export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"

# Check if PostgreSQL client tools are available
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client tools not found"
    exit 1
fi

echo "✅ PostgreSQL client tools found"
echo

# Prompt for password
echo "🔑 Enter your Supabase database password:"
echo "   (Found in Supabase Dashboard > Settings > Database > 'Database password')"
read -s -p "Password: " DB_PASSWORD
echo
echo

# Test different connection formats
echo "🧪 Testing connection formats..."
echo

# Format 1: Direct connection (most common)
echo "1️⃣ Testing direct connection format..."
DB_URL_1="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
if psql "$DB_URL_1" -c "SELECT 1;" &> /dev/null; then
    echo "✅ Format 1 WORKS: Direct connection"
    WORKING_URL="$DB_URL_1"
else
    echo "❌ Format 1 failed"
fi

# Format 2: Without pooler
echo "2️⃣ Testing direct database connection..."
DB_URL_2="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
if psql "$DB_URL_2" -c "SELECT 1;" &> /dev/null; then
    echo "✅ Format 2 WORKS: Direct database"
    WORKING_URL="$DB_URL_2"
else
    echo "❌ Format 2 failed"
fi

# Format 3: Alternative pooler format
echo "3️⃣ Testing alternative pooler format..."
DB_URL_3="postgresql://postgres:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
if psql "$DB_URL_3" -c "SELECT 1;" &> /dev/null; then
    echo "✅ Format 3 WORKS: Alternative pooler"
    WORKING_URL="$DB_URL_3"
else
    echo "❌ Format 3 failed"
fi

# Format 4: Session mode
echo "4️⃣ Testing session mode..."
DB_URL_4="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
if psql "$DB_URL_4" -c "SELECT 1;" &> /dev/null; then
    echo "✅ Format 4 WORKS: Session mode"
    WORKING_URL="$DB_URL_4"
else
    echo "❌ Format 4 failed"
fi

echo

if [ -n "$WORKING_URL" ]; then
    echo "🎉 Found working connection!"
    echo "URL: $WORKING_URL"
    echo
    
    # Test a simple query to verify access
    echo "🔍 Testing database access..."
    echo "Tables in public schema:"
    psql "$WORKING_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
    
    echo
    echo "✅ Database connection verified!"
    echo "📁 You can now run the export with this URL"
    
    # Save the working URL for the export script
    echo "WORKING_DB_URL=\"$WORKING_URL\"" > .db_connection_test
    echo "💾 Connection details saved to .db_connection_test"
    
else
    echo "❌ None of the connection formats worked."
    echo
    echo "🔧 Troubleshooting steps:"
    echo "1. Verify your password in Supabase Dashboard > Settings > Database"
    echo "2. Check if you have database access permissions"
    echo "3. Try resetting your database password"
    echo "4. Check if your IP is allowed (if you have IP restrictions)"
    echo
    echo "🌐 Alternative: You can find the exact connection string in:"
    echo "   Supabase Dashboard > Settings > Database > Connection string"
fi