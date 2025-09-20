#!/bin/bash

# EPSM Database Backup Script
# This script creates a backup of the PostgreSQL database

set -e

BACKUP_DIR="./database/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
COMPOSE_FILE="docker-compose.yml"

# Check if running in production
if [ "$1" = "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "📦 Creating production database backup..."
else
    echo "📦 Creating development database backup..."
fi

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Create database backup
echo "💾 Backing up PostgreSQL databases..."

# Backup main database
docker-compose -f ${COMPOSE_FILE} exec -T database pg_dump -U epsm_user -d epsm_db --clean --if-exists > "${BACKUP_DIR}/epsm_db_${TIMESTAMP}.sql"

# Backup materials database
docker-compose -f ${COMPOSE_FILE} exec -T database pg_dump -U epsm_user -d epsm_materials --clean --if-exists > "${BACKUP_DIR}/epsm_materials_${TIMESTAMP}.sql"

# Create combined backup
cat "${BACKUP_DIR}/epsm_db_${TIMESTAMP}.sql" "${BACKUP_DIR}/epsm_materials_${TIMESTAMP}.sql" > "${BACKUP_DIR}/epsm_complete_${TIMESTAMP}.sql"

# Compress backups
gzip "${BACKUP_DIR}/epsm_db_${TIMESTAMP}.sql"
gzip "${BACKUP_DIR}/epsm_materials_${TIMESTAMP}.sql"
gzip "${BACKUP_DIR}/epsm_complete_${TIMESTAMP}.sql"

echo "✅ Database backup completed:"
echo "   📁 Main DB: ${BACKUP_DIR}/epsm_db_${TIMESTAMP}.sql.gz"
echo "   📁 Materials DB: ${BACKUP_DIR}/epsm_materials_${TIMESTAMP}.sql.gz"
echo "   📁 Combined: ${BACKUP_DIR}/epsm_complete_${TIMESTAMP}.sql.gz"

# Cleanup old backups (keep last 30 days)
echo "🧹 Cleaning up old backups..."
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +30 -delete

# Optional: Upload to S3 if configured
if [ -n "$BACKUP_S3_BUCKET" ] && command -v aws &> /dev/null; then
    echo "☁️  Uploading backup to S3..."
    aws s3 cp "${BACKUP_DIR}/epsm_complete_${TIMESTAMP}.sql.gz" "s3://${BACKUP_S3_BUCKET}/backups/"
    echo "✅ Backup uploaded to S3"
fi

echo "🎉 Backup process completed!"