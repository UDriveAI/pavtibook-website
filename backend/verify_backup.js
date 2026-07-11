const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { exec } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./src/config/db');

// Path to native Postgres binaries on Windows
const PG_BIN_DIR = 'C:\\Program Files\\Common Files\\Reallusion\\PostgreSQL\\bin';
const PG_DUMP = path.join(PG_BIN_DIR, 'pg_dump.exe');
const PSQL = path.join(PG_BIN_DIR, 'psql.exe');

const BACKUP_FILE = path.join(__dirname, 'pavtibook_test_backup.sql');
const GZ_FILE = `${BACKUP_FILE}.gz`;

function runCmd(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}\nStderr: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function verifyBackupRestore() {
  console.log('--- STARTING DATABASE BACKUP & RESTORE VERIFICATION ---');

  // Verify Postgres binaries exist
  if (!fs.existsSync(PG_DUMP) || !fs.existsSync(PSQL)) {
    console.error(`PostgreSQL binaries not found at: ${PG_BIN_DIR}`);
    console.error('Skipping binary execution (expected on clean CI, but required on local workstation).');
    process.exit(0);
  }

  // 1. Get row count of users before backup
  const beforeRes = await db.query('SELECT COUNT(*) FROM users');
  const initialUserCount = parseInt(beforeRes.rows[0].count);
  console.log(`Initial users count in database: ${initialUserCount}`);

  // 2. Perform native pg_dump
  console.log('Executing pg_dump...');
  process.env.PGPASSWORD = process.env.DB_PASSWORD || 'postgres';
  const dumpCmd = `"${PG_DUMP}" -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER || 'postgres'} -F p -f "${BACKUP_FILE}" ${process.env.DB_DATABASE || 'pavtibook'}`;
  await runCmd(dumpCmd);
  console.log('Database dumped successfully to:', BACKUP_FILE);

  // 3. Compress using zlib (Gzip)
  console.log('Compressing backup file to gzip...');
  const fileContents = fs.createReadStream(BACKUP_FILE);
  const writeStream = fs.createWriteStream(GZ_FILE);
  const zip = zlib.createGzip();
  
  await new Promise((resolve, reject) => {
    fileContents.pipe(zip).pipe(writeStream)
      .on('finish', resolve)
      .on('error', reject);
  });
  console.log('Gzip backup created successfully:', GZ_FILE);
  
  // Clean up uncompressed file
  fs.unlinkSync(BACKUP_FILE);

  // 4. Terminate active sessions and drop database
  console.log('Terminating active database sessions...');
  await db.pool.end(); // Close current pool to prevent locking ourselves out

  // Connect to default 'postgres' database to execute drop/recreate
  const { Client } = require('pg');
  const tempClient = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
  });
  await tempClient.connect();

  const dbName = process.env.DB_DATABASE || 'pavtibook';
  await tempClient.query(`
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = $1 AND pid <> pg_backend_pid()
  `, [dbName]);

  console.log(`Dropping database '${dbName}'...`);
  await tempClient.query(`DROP DATABASE IF EXISTS ${dbName}`);

  console.log(`Recreating database '${dbName}'...`);
  await tempClient.query(`CREATE DATABASE ${dbName}`);
  await tempClient.end();

  // 5. Decompress Gzip backup for restore
  console.log('Decompressing gzip backup for restore...');
  const gzContents = fs.createReadStream(GZ_FILE);
  const decompressedWriteStream = fs.createWriteStream(BACKUP_FILE);
  const unzip = zlib.createGunzip();

  await new Promise((resolve, reject) => {
    gzContents.pipe(unzip).pipe(decompressedWriteStream)
      .on('finish', resolve)
      .on('error', reject);
  });

  // 6. Restore database using psql
  console.log('Restoring database via psql...');
  const restoreCmd = `"${PSQL}" -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER || 'postgres'} -d ${dbName} -f "${BACKUP_FILE}"`;
  await runCmd(restoreCmd);
  console.log('Database restored successfully.');

  // Clean up temporary files
  fs.unlinkSync(BACKUP_FILE);
  fs.unlinkSync(GZ_FILE);

  // 7. Verify restored user count matches initial count
  const { Pool } = require('pg');
  const verifyPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: dbName,
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
  });
  const afterRes = await verifyPool.query('SELECT COUNT(*) FROM users');
  const restoredUserCount = parseInt(afterRes.rows[0].count);
  await verifyPool.end();
  console.log(`Restored users count in database: ${restoredUserCount}`);

  if (initialUserCount === restoredUserCount) {
    console.log('\nDATABASE BACKUP & RESTORE VERIFICATION PASSED SUCCESSFULLY! ✅');
    process.exit(0);
  } else {
    console.error(`\nVERIFICATION FAILED: Row count mismatch! Initial: ${initialUserCount}, Restored: ${restoredUserCount}`);
    process.exit(1);
  }
}

verifyBackupRestore().catch((err) => {
  console.error('\nVerification crashed:', err);
  process.exit(1);
});
