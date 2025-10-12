#!/bin/bash
# ============================================================================
# Database Health Check Script
# ============================================================================
# Verifies that all databases are properly configured and migrated
# Usage: bash scripts/check-database-health.sh
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  EPSM Database Health Check                ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Determine which docker-compose file to use
if [ -f "docker-compose.production.yml" ]; then
    COMPOSE_FILE="docker-compose.production.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

print_header

# Check if backend container is running
print_info "Checking if backend container is running..."
if ! docker-compose -f "$COMPOSE_FILE" ps backend | grep -q "Up"; then
    print_error "Backend container is not running"
    exit 1
fi
print_success "Backend container is running"

# Function to check database connectivity
check_db_connection() {
    local db_name=$1
    local db_user=$2
    local db_host=$3
    
    print_info "Checking $db_name connection..."
    
    if docker-compose -f "$COMPOSE_FILE" exec -T database psql -U "$db_user" -d "$db_name" -c "SELECT 1" > /dev/null 2>&1; then
        print_success "$db_name is accessible"
        return 0
    else
        print_error "$db_name is NOT accessible"
        return 1
    fi
}

# Function to check if tables exist
check_tables() {
    local db_name=$1
    local db_user=$2
    local expected_tables=$3
    
    print_info "Checking tables in $db_name..."
    
    local tables=$(docker-compose -f "$COMPOSE_FILE" exec -T database psql -U "$db_user" -d "$db_name" -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public'" 2>/dev/null | grep -v "^$" | wc -l)
    
    if [ "$tables" -ge "$expected_tables" ]; then
        print_success "$db_name has $tables tables (expected at least $expected_tables)"
        return 0
    else
        print_warning "$db_name has only $tables tables (expected at least $expected_tables)"
        return 1
    fi
}

# Function to check specific critical tables
check_critical_table() {
    local db_name=$1
    local db_user=$2
    local table_name=$3
    
    if docker-compose -f "$COMPOSE_FILE" exec -T database psql -U "$db_user" -d "$db_name" -t -c "\dt $table_name" 2>/dev/null | grep -q "$table_name"; then
        print_success "Table '$table_name' exists in $db_name"
        return 0
    else
        print_error "Table '$table_name' MISSING in $db_name"
        return 1
    fi
}

echo ""
echo "=== Default Database (epsm_db) ==="
check_db_connection "epsm_db" "epsm_user" "database"
check_tables "epsm_db" "epsm_user" 10
check_critical_table "epsm_db" "epsm_user" "simulation_runs"
check_critical_table "epsm_db" "epsm_user" "auth_user"

echo ""
echo "=== Materials Database (epsm_materials) ==="
check_db_connection "epsm_materials" "epsm_user" "database"
check_tables "epsm_materials" "epsm_user" 5
check_critical_table "epsm_materials" "epsm_user" "materials"
check_critical_table "epsm_materials" "epsm_user" "constructions"
check_critical_table "epsm_materials" "epsm_user" "scenarios"

echo ""
echo "=== Results Database (epsm_results) ==="
check_db_connection "epsm_results" "epsm_results_user" "database"
check_tables "epsm_results" "epsm_results_user" 3
check_critical_table "epsm_results" "epsm_results_user" "simulation_results"
check_critical_table "epsm_results" "epsm_results_user" "simulation_zones"
check_critical_table "epsm_results" "epsm_results_user" "simulation_energy_uses"

echo ""
echo "=== Migration Status ==="
print_info "Checking migration status..."

echo ""
echo "Default database migrations:"
docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py showmigrations --database=default 2>&1 | grep -E "^\[X\]" | tail -5

echo ""
echo "Materials database migrations:"
docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py showmigrations database --database=materials_db 2>&1 | grep -E "^\[X\]" | tail -5

echo ""
echo "Results database migrations:"
docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py showmigrations simulation --database=results_db 2>&1 | grep -E "^\[X\]" | tail -5

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Database Health Check Complete            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
