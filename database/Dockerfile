# Custom PostgreSQL container with EPSM-specific setup
FROM postgres:15-alpine

# Install additional extensions if needed
RUN apk add --no-cache postgresql-contrib

# Copy initialization scripts
COPY init/ /docker-entrypoint-initdb.d/
# COPY exports/ /docker-entrypoint-initdb.d/exports/  # Disabled for clean Django setup
COPY migrations/ /docker-entrypoint-initdb.d/migrations/

# Set proper permissions
RUN chmod -R 755 /docker-entrypoint-initdb.d/

# Expose PostgreSQL port
EXPOSE 5432

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB || exit 1