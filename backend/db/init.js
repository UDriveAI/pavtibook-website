const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initialize() {
  const credentials = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
  };

  const dbName = process.env.DB_DATABASE || 'pavtibook';

  // Step 1: Connect to default postgres DB to check/create pavtibook DB
  console.log(`Connecting to default postgres database at ${credentials.host}:${credentials.port}...`);
  let client = new Client({ ...credentials, database: 'postgres' });
  await client.connect();

  try {
    console.log(`Dropping database '${dbName}' if exists...`);
    // Terminate any existing connections to the database to ensure we can drop it
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1 AND pid <> pg_backend_pid()
    `, [dbName]);
    await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
    console.log(`Creating database '${dbName}'...`);
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`Database '${dbName}' created successfully.`);
  } catch (err) {
    console.error('Error checking/creating database:', err);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Step 2: Connect directly to pavtibook DB and run schema/seeds
  console.log(`Connecting to '${dbName}' database...`);
  client = new Client({ ...credentials, database: dbName });
  await client.connect();

  try {
    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Applying schema migrations...');
    await client.query(schemaSql);
    console.log('Schema applied successfully.');

    console.log('Reading seed.sql...');
    const seedPath = path.join(__dirname, 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      console.log('Seeding initial data...');
      await client.query(seedSql);
      console.log('Data seeded successfully.');
    } else {
      console.log('No seed.sql found, skipping seeding.');
    }
  } catch (err) {
    console.error('Migration / Seeding failed:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database initialization completed.');
  }
}

initialize();
