// src/lib/db.ts
import { Pool } from 'pg';

// Ensure that environment variables are loaded. 
// Next.js typically handles .env.local, .env.development, etc.
// For non-NEXT_PUBLIC variables, they are only available server-side.

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  // You might want to add SSL configuration for production environments
  // ssl: {
  //   rejectUnauthorized: false // Or configure with CA certs
  // }
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  // process.exit(-1); // Consider if you want to exit on pool errors
});

export async function checkDbConnection() {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT NOW()'); // Simple query to check connection
    console.log('PostgreSQL connected successfully.');
    return true;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Optional: Perform an initial connection check when the module loads
// (async () => {
//   await checkDbConnection();
// })();

export default pool;
