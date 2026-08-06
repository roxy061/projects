// db.js - MariaDB Connection Pool Configuration
const mariadb = require('mariadb');
require('dotenv').config();

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'proj_user',
  password: process.env.DB_PASS || 'SecretPass123!',
  database: process.env.DB_NAME || 'dept_projects',
  connectionLimit: 10,
  allowPublicKeyRetrieval: true
});

// Test connection on startup
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('✅ MariaDB Connected Successfully to Database:', process.env.DB_NAME || 'dept_projects');
  } catch (err) {
    console.warn('⚠️ Primary Database User Connection Warning:', err.message);
    console.warn('ℹ️ Please ensure MariaDB is running and schema.sql has been executed.');
  } finally {
    if (conn) conn.release();
  }
}

testConnection();

module.exports = pool;
