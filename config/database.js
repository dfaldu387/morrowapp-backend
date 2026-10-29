const { Pool } = require('pg');

const isRemoteDB = process.env.DB_HOST && !process.env.DB_HOST.includes('localhost');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'morrow_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ...(isRemoteDB && { ssl: { rejectUnauthorized: false } }),
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

module.exports = pool;
