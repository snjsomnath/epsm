#!/bin/bash

# EPSM Database Restore Script
# This script restores the PostgreSQL database from a backup

set -e

BACKUP_DIR="./database/backups"
COMPOSE_FILE="docker-compose.yml"

# Check if running in production
if [ "$1" = "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "🔄 Restoring production database..."
else
    echo "🔄 Restoring development database..."
fi

# Check if backup file is provided
if [ -z "$2" ]; then
    echo "📋 Available backups:"
    ls -la ${BACKUP_DIR}/*.sql.gz 2>/dev/null || echo "No backups found"
    echo ""
    echo "Usage: $0 [prod] <backup_file>"
    echo "Example: $0 epsm_complete_20240320_143000.sql.gz"
    exit 1
fi

BACKUP_FILE="$2"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Check if backup file exists
if [ ! -f "${BACKUP_PATH}" ]; then
    echo "❌ Backup file not found: ${BACKUP_PATH}"
    exit 1
fi

# Confirm restoration
echo "⚠️  WARNING: This will replace all data in the database!"
echo "📁 Backup file: ${BACKUP_PATH}"
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Restoration cancelled"
    exit 1
fi

# Stop services that depend on the database
echo "🛑 Stopping dependent services..."
docker-compose -f ${COMPOSE_FILE} stop backend frontend

# Decompress backup if needed
TEMP_FILE="/tmp/epsm_restore_$(date +%s).sql"
if [[ "${BACKUP_FILE}" == *.gz ]]; then
    echo "📦 Decompressing backup..."
    gunzip -c "${BACKUP_PATH}" > "${TEMP_FILE}"
else
    cp "${BACKUP_PATH}" "${TEMP_FILE}"
fi

# Restore database
echo "🔄 Restoring database..."
docker-compose -f ${COMPOSE_FILE} exec -T database psql -U epsm_user -d epsm_db < "${TEMP_FILE}"

# Cleanup temp file
rm -f "${TEMP_FILE}"

# Restart services
echo "🚀 Restarting services..."
docker-compose -f ${COMPOSE_FILE} up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

echo "✅ Database restoration completed successfully!"

# Show status
docker-compose -f ${COMPOSE_FILE} ps