import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'henry_db',
  user: process.env.DB_USER || 'henry',
  password: process.env.DB_PASSWORD || 'example123',
});

export default pool;
