#!/bin/sh
# Database restore script for PavtiBook
# Restores a compressed SQL backup (.sql.gz) into the postgres container.

BACKUP_FILE=$1
CONTAINER_NAME="pavtibook_postgres"
DB_USER="postgres"
DB_NAME="pavtibook"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "[$(date)] WARNING: This will drop and recreate the active '${DB_NAME}' database!"
echo "[$(date)] All current data will be permanently overwritten."
read -p "Are you sure you want to proceed with restore? (y/N) " confirm

if [ "${confirm}" != "y" ] && [ "${confirm}" != "Y" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "[$(date)] Terminating active database connections..."
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "
  SELECT pg_terminate_backend(pg_stat_activity.pid)
  FROM pg_stat_activity
  WHERE pg_stat_activity.datname = '${DB_NAME}' AND pid <> pg_backend_pid();
"

echo "[$(date)] Recreating database '${DB_NAME}'..."
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME};"

echo "[$(date)] Restoring data from ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"

if [ $? -eq 0 ]; then
  echo "[$(date)] Database restore completed successfully! ✅"
else
  echo "[$(date)] ERROR: Database restore failed! ❌" >&2
  exit 1
fi
