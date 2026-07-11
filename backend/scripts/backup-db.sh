#!/bin/sh
# Daily database backup script for PavtiBook
# Retains backups for a rolling 7 days.

# Define directories (defaults to host mount path or local /backups)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/pavtibook_backup_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="pavtibook_postgres"
DB_USER="postgres"
DB_NAME="pavtibook"

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting daily database backup..."

# Execute pg_dump inside the docker container and stream to a compressed file on the host
docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"

# Verify exit status of the backup
if [ $? -eq 0 ] && [ -s "${BACKUP_FILE}" ]; then
  echo "[$(date)] Backup completed successfully: ${BACKUP_FILE}"
else
  echo "[$(date)] ERROR: PostgreSQL backup failed or generated empty file!" >&2
  # Remove invalid empty backup file if created
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# Retention policy: delete backups older than 7 days
echo "[$(date)] Applying 7-day retention policy..."
find "${BACKUP_DIR}" -name "pavtibook_backup_*.sql.gz" -type f -mtime +7 -delete

echo "[$(date)] Database backup maintenance completed."
