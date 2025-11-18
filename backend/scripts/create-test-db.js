/**
 * Script to create the test database
 * Run with: node scripts/create-test-db.js
 */

import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: '127.0.0.1',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres', // Connect to default database
});

async function createTestDatabase() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database already exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'postgres_test'"
    );

    if (result.rows.length > 0) {
      console.log('Test database "postgres_test" already exists');
    } else {
      // Create the test database
      await client.query('CREATE DATABASE postgres_test');
      console.log('Test database "postgres_test" created successfully');
    }
  } catch (error) {
    console.error('Error creating test database:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTestDatabase();
