#!/usr/bin/env bash

set -Eeuo pipefail

: "${POSTGRES_HOST:?POSTGRES_HOST is required}"
: "${POSTGRES_PORT:?POSTGRES_PORT is required}"

: "${POSTGRES_ADMIN_USER:?POSTGRES_ADMIN_USER is required}"
: "${POSTGRES_ADMIN_PASSWORD:?POSTGRES_ADMIN_PASSWORD is required}"

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"


echo "Initializing PostgreSQL resources..."
echo "  Host     : ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "  Database : ${POSTGRES_ADMIN_DB}"
echo "  User     : ${POSTGRES_ADMIN_USER}"


echo "Waiting for PostgreSQL..."

export PGPASSWORD="${POSTGRES_ADMIN_PASSWORD}"

until pg_isready \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_ADMIN_USER}"
do
    sleep 2
done


echo "Creating role '${POSTGRES_USER}' and database '${POSTGRES_DB}'..."

psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_ADMIN_USER}" \
    -d "${POSTGRES_ADMIN_DB}" \
    -v ON_ERROR_STOP=1 <<EOF

DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT
        FROM pg_catalog.pg_roles
        WHERE rolname = '${POSTGRES_USER}'
    ) THEN
        CREATE ROLE "${POSTGRES_USER}"
            LOGIN
            PASSWORD '${POSTGRES_PASSWORD}';
    END IF;
END
\$\$;

SELECT format(
    'CREATE DATABASE %I OWNER %I',
    '${POSTGRES_DB}',
    '${POSTGRES_USER}'
)
WHERE NOT EXISTS (
    SELECT
    FROM pg_database
    WHERE datname='${POSTGRES_DB}'
)
\gexec

ALTER DATABASE "${POSTGRES_DB}"
    OWNER TO "${POSTGRES_USER}";

GRANT ALL PRIVILEGES
ON DATABASE "${POSTGRES_DB}"
TO "${POSTGRES_USER}";
EOF

echo "Database ready."