const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Create connection pool configuration from .env with connection resilience settings
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'department_projects',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 15,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Connection Pool instance
const pool = mysql.createPool(poolConfig);

// Handle pool connection errors to prevent unhandled process crashes
pool.on('error', (err) => {
  console.error('⚠️ MariaDB Pool Unexpected Error:', err.message);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.warn('🔄 Reconnecting to MariaDB...');
  }
});

/**
 * Initialize Database & Tables safely with multi-statement support
 */
async function initDatabase() {
  try {
    // 1. Create connection without database name to ensure DB exists
    const tempConn = await mysql.createConnection({
      host: poolConfig.host,
      user: poolConfig.user,
      password: poolConfig.password,
      port: poolConfig.port
    });

    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${poolConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConn.end();

    // 2. Locate schema.sql (check root or backend directory)
    let schemaPath = path.join(__dirname, '../../schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(__dirname, '../schema.sql');
    }

    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const conn = await pool.getConnection();
      
      // Parse SQL statements safely removing inline comments
      const statements = schemaSql
        .replace(/--.*$/gm, '') // Remove single-line comments
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const sql of statements) {
        if (sql) {
          try {
            await conn.query(sql);
          } catch (err) {
            // ER_DUP_ENTRY is expected when seed rows already exist
            if (err.code !== 'ER_DUP_ENTRY') {
              console.warn('⚠️ Schema initialization query notice:', err.message);
            }
          }
        }
      }
      conn.release();
      console.log('✅ MariaDB Database & Connection Pool initialized and stable.');
    }
  } catch (error) {
    console.error('❌ MariaDB Connection/Initialization Warning:', error.message);
    console.warn('⚠️ Please verify XAMPP MySQL/MariaDB service is running on port ' + poolConfig.port);
  }
}

// Execute database startup check
initDatabase();

module.exports = pool;
