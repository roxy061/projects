const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Create connection pool configuration from .env
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'department_projects',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Connection Pool instance
const pool = mysql.createPool(poolConfig);

/**
 * Initialize Database & Tables if they don't exist yet
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
      
      // Split statements by semicolon and execute non-empty statements
      const statements = schemaSql
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const sql of statements) {
        if (sql) {
          try {
            await conn.query(sql);
          } catch (err) {
            // Ignore minor duplicate insert warnings
            if (err.code !== 'ER_DUP_ENTRY') {
              console.warn('⚠️ Schema query warning:', err.message);
            }
          }
        }
      }
      conn.release();
      console.log('✅ MariaDB Database & Tables verified and initialized successfully.');
    }
  } catch (error) {
    console.error('❌ Database Initialization Error:', error.message);
  }
}

// Execute auto-initialization check
initDatabase();

module.exports = pool;
