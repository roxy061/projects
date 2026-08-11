/**
 * ============================================================
 * Department Project Showcase - Express Server & API Routes
 * ============================================================
 * Server: Node.js + Express.js
 * Database: MariaDB / MySQL (mysql2/promise)
 * Authentication: JWT (JSON Web Token) + bcryptjs
 * Storage: Multer File Upload for Cover Images
 */

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'department_showcase_super_secret_key_2026';

// ------------------------------------------------------------
// 1. MIDDLEWARES & STATIC FILES CONFIGURATION
// ------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// สร้างโฟลเดอร์ uploads สำหรับเก็บรูปภาพหากยังไม่มี
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ให้บริการ Static Files สำหรับรูปภาพที่อัปโหลด
app.use('/uploads', express.static(uploadsDir));

// ให้บริการ Static Files สำหรับ Frontend (เปิดหน้าเว็บผ่าน http://localhost:5000)
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

// ------------------------------------------------------------
// 2. MULTER CONFIGURATION (สำหรับการอัปโหลดรูปภาพ)
// ------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'cover-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // จำกัดขนาด 5MB
  fileFilter: fileFilter
});

// ------------------------------------------------------------
// 3. MARIADB / MYSQL CONNECTION POOL
// ------------------------------------------------------------
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS ?? '',
  database: process.env.DB_NAME || 'department_projects',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// ทดสอบการเชื่อมต่อฐานข้อมูล
// ทดสอบการเชื่อมต่อฐานข้อมูลและอัปเดต Schema
async function checkDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ เชื่อมต่อฐานข้อมูล MariaDB/MySQL สำเร็จ!');
    connection.release();
    await migrateDatabaseSchema();
    return true;
  } catch (error) {
    console.error('⚠️ ไม่สามารถเชื่อมต่อฐานข้อมูลได้:', error.message);
    console.error('กรุณาตรวจสอบว่า MariaDB/MySQL ทำงานอยู่ และข้อมูลใน .env หรือ database.sql ถูกต้อง');
    return false;
  }
}

// อัปเดตโครงสร้างตาราง users อัตโนมัติหากยังไม่มีคอลัมน์โปรไฟล์
async function migrateDatabaseSchema() {
  try {
    const columns = [
      "ALTER TABLE users ADD COLUMN `bio` TEXT DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN `email` VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN `github` VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN `website` VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN `avatar` VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE projects ADD COLUMN `department` VARCHAR(100) DEFAULT NULL"
    ];

    for (const colQuery of columns) {
      try {
        await pool.query(colQuery);
      } catch (err) {
        // ข้ามข้อผิดพลาดกรณีมีคอลัมน์อยู่แล้ว
      }
    }
  } catch (error) {
    console.error('Schema migration note:', error.message);
  }
}

// ------------------------------------------------------------
// 4. AUTHENTICATION MIDDLEWARE (JWT Verification)
// ------------------------------------------------------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
    req.user = user; // { id, username, fullname, role }
    next();
  });
};

// ------------------------------------------------------------
// 5. API ENDPOINTS & ROUTES
// ------------------------------------------------------------

/**
 * @route GET /api/health
 * @desc ตรวจสอบสถานะ Backend Server และการเชื่อมต่อฐานข้อมูล
 */
app.get('/api/health', async (req, res) => {
  const isDbConnected = await checkDatabaseConnection();
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    databaseConnected: isDbConnected
  });
});

/**
 * @route POST /api/auth/register
 * @desc สมัครสมาชิกใหม่ (Default role: 'student')
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, fullname } = req.body;

    if (!username || !password || !fullname) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
    }

    // ตรวจสอบว่ามี username นี้อยู่แล้วหรือไม่
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'ชื่อผู้ใช้นี้มีในระบบแล้ว กรุณาใช้ชื่ออื่น' });
    }

    // Hash Password ด้วย bcryptjs
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // บันทึกลงฐานข้อมูล
    const [result] = await pool.query(
      'INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)',
      [username.trim(), hashedPassword, fullname.trim(), 'student']
    );

    const newUser = {
      id: result.insertId,
      username: username.trim(),
      fullname: fullname.trim(),
      role: 'student',
      bio: '',
      email: '',
      github: '',
      website: '',
      avatar: null
    };

    // สร้าง JWT Token
    const token = jwt.sign(newUser, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ!',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ในการสมัครสมาชิก' });
  }
});

/**
 * @route POST /api/auth/login
 * @desc เข้าสู่ระบบ (คืนค่า JWT Token และข้อมูลผู้ใช้)
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    // ค้นหาผู้ใช้ตาม username
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = users[0];

    // เปรียบเทียบรหัสผ่านด้วย bcryptjs
    let isMatch = await bcrypt.compare(password, user.password);

    // Fallback: หากเปรียบเทียบ bcrypt ไม่ตรง (เช่น กรณี plaintext จากการทดสอบ)
    if (!isMatch && password === user.password) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const userPayload = {
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      role: user.role,
      bio: user.bio || '',
      email: user.email || '',
      github: user.github || '',
      website: user.website || '',
      avatar: user.avatar || null
    };

    // สร้าง JWT Token
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ!',
      token,
      user: userPayload
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

/**
 * ============================================================
 * USER PROFILE ENDPOINTS
 * ============================================================
 */

/**
 * @route GET /api/users/profile/me
 * @desc ดึงข้อมูลโปรไฟล์ของผู้ใช้ที่เข้าสู่ระบบปัจจุบัน
 */
app.get('/api/users/profile/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await pool.query(
      'SELECT id, username, fullname, role, bio, email, github, website, avatar, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ในระบบ' });
    }

    const user = users[0];
    const [projectCountRes] = await pool.query('SELECT COUNT(*) as count FROM projects WHERE user_id = ?', [userId]);
    user.projects_count = projectCountRes[0].count;

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get Profile Me Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์' });
  }
});

/**
 * @route GET /api/users/profile/:username
 * @desc ดึงข้อมูลโปรไฟล์สาธารณะและรายการโปรเจกต์ตาม Username
 */
app.get('/api/users/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const [users] = await pool.query(
      'SELECT id, username, fullname, role, bio, email, github, website, avatar, created_at FROM users WHERE username = ?',
      [username.trim()]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้นี้ในระบบ' });
    }

    const user = users[0];
    const [projects] = await pool.query(
      `SELECT p.*, u.fullname AS author_name, u.username AS author_username 
       FROM projects p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.user_id = ? 
       ORDER BY p.created_at DESC`,
      [user.id]
    );

    user.projects_count = projects.length;

    res.json({
      success: true,
      data: {
        profile: user,
        projects: projects
      }
    });
  } catch (error) {
    console.error('Get Public Profile Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์ผู้ใช้' });
  }
});

/**
 * @route PUT /api/users/profile/me
 * @desc อัปเดตข้อมูลโปรไฟล์ส่วนตัว (รวมทั้งเปลี่ยนรูปอวาตาร์ หรือรหัสผ่าน)
 */
app.put('/api/users/profile/me', authenticateToken, upload.single('avatar_file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullname, bio, email, github, website, avatar_url, new_password } = req.body;

    const [existingUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ในระบบ' });
    }

    const currentUser = existingUsers[0];
    let newAvatar = currentUser.avatar;

    if (req.file) {
      newAvatar = `/uploads/${req.file.filename}`;
    } else if (avatar_url !== undefined && avatar_url.trim() !== '') {
      newAvatar = avatar_url.trim();
    }

    let hashedPassword = currentUser.password;
    if (new_password && new_password.trim().length >= 6) {
      hashedPassword = await bcrypt.hash(new_password.trim(), 10);
    }

    const updatedFullname = fullname ? fullname.trim() : currentUser.fullname;
    const updatedBio = bio !== undefined ? bio.trim() : currentUser.bio;
    const updatedEmail = email !== undefined ? email.trim() : currentUser.email;
    const updatedGithub = github !== undefined ? github.trim() : currentUser.github;
    const updatedWebsite = website !== undefined ? website.trim() : currentUser.website;

    await pool.query(
      `UPDATE users 
       SET fullname = ?, bio = ?, email = ?, github = ?, website = ?, avatar = ?, password = ? 
       WHERE id = ?`,
      [updatedFullname, updatedBio, updatedEmail, updatedGithub, updatedWebsite, newAvatar, hashedPassword, userId]
    );

    const updatedUserPayload = {
      id: userId,
      username: currentUser.username,
      fullname: updatedFullname,
      role: currentUser.role,
      bio: updatedBio,
      email: updatedEmail,
      github: updatedGithub,
      website: updatedWebsite,
      avatar: newAvatar,
      created_at: currentUser.created_at
    };

    const token = jwt.sign(
      { id: updatedUserPayload.id, username: updatedUserPayload.username, fullname: updatedUserPayload.fullname, role: updatedUserPayload.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว!',
      token,
      user: updatedUserPayload
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์' });
  }
});

/**
 * @route GET /api/projects
 * @desc ดึงรายการโปรเจกต์ทั้งหมด (รองรับ ค้นหาเรียลไทม์ ?q= และ กรองด้วยแท็ก ?tag=)
 */
app.get('/api/projects', async (req, res) => {
  try {
    const { q, tag, department } = req.query;

    let sql = `
      SELECT p.*, u.fullname AS author_name, u.username AS author_username 
      FROM projects p
      JOIN users u ON p.user_id = u.id
    `;
    const params = [];
    const conditions = [];

    // เงื่อนไขการค้นหาคำค้น (q)
    if (q && q.trim() !== '') {
      const searchTerm = `%${q.trim()}%`;
      conditions.push('(p.title LIKE ? OR p.short_description LIKE ? OR p.full_description LIKE ? OR p.tags LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // เงื่อนไขการกรองแท็ก (tag)
    if (tag && tag.trim() !== '' && tag !== 'All') {
      const tagTerm = `%${tag.trim()}%`;
      conditions.push('p.tags LIKE ?');
      params.push(tagTerm);
    }

    // เงื่อนไขการกรองแผนก (department)
    if (department && department.trim() !== '' && department !== 'All') {
      conditions.push('p.department = ?');
      params.push(department.trim());
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY p.created_at DESC';

    const [projects] = await pool.query(sql, params);

    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    console.error('Get Projects Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรเจกต์' });
  }
});

/**
 * @route GET /api/projects/:id
 * @desc ดึงรายละเอียดโปรเจกต์เดี่ยวตาม ID
 */
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [projects] = await pool.query(
      `SELECT p.*, u.fullname AS author_name, u.username AS author_username, u.role AS author_role
       FROM projects p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโปรเจกต์นี้' });
    }

    res.json({
      success: true,
      data: projects[0]
    });
  } catch (error) {
    console.error('Get Project Detail Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายละเอียดโปรเจกต์' });
  }
});

/**
 * @route POST /api/projects
 * @desc เพิ่มโปรเจกต์ใหม่ (Require Auth + Support Cover Image Upload หรือ Image URL)
 */
app.post('/api/projects', authenticateToken, upload.single('cover_image_file'), async (req, res) => {
  try {
    const { title, short_description, full_description, demo_url, github_url, tags, cover_image_url, department } = req.body;
    const userId = req.user.id;

    if (!title || !short_description || !full_description) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อโปรเจกต์ และคำอธิบายให้ครบถ้วน' });
    }

    // กำหนดพาธของรูปภาพปกลำดับความสำคัญ: ไฟล์อัปโหลด > URL ลิงก์ > รูปเริ่มต้น
    let coverImagePath = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80';
    if (req.file) {
      coverImagePath = `/uploads/${req.file.filename}`;
    } else if (cover_image_url && cover_image_url.trim() !== '') {
      coverImagePath = cover_image_url.trim();
    }

    const [result] = await pool.query(
      `INSERT INTO projects 
       (user_id, title, short_description, full_description, cover_image, demo_url, github_url, tags, department) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title.trim(),
        short_description.trim(),
        full_description.trim(),
        coverImagePath,
        demo_url ? demo_url.trim() : '',
        github_url ? github_url.trim() : '',
        tags ? tags.trim() : '',
        department ? department.trim() : ''
      ]
    );

    res.status(201).json({
      success: true,
      message: 'เพิ่มผลงานโปรเจกต์ใหม่เรียบร้อยแล้ว!',
      projectId: result.insertId
    });
  } catch (error) {
    console.error('Create Project Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มโปรเจกต์' });
  }
});

/**
 * @route PUT /api/projects/:id
 * @desc แก้ไขโปรเจกต์ (เฉพาะ Owner หรือ Admin)
 */
app.put('/api/projects/:id', authenticateToken, upload.single('cover_image_file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, short_description, full_description, demo_url, github_url, tags, cover_image_url, department } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // ตรวจสอบว่าโปรเจกต์นี้มีอยู่จริงหรือไม่
    const [existing] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบโปรเจกต์ที่ต้องการแก้ไข' });
    }

    const project = existing[0];

    // ตรวจสอบสิทธิ์ (ต้องเป็นเจ้าของผลงาน หรือ เป็น Admin)
    if (project.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์แก้ไขผลงานของผู้อื่น' });
    }

    // กำหนดรูปภาพปกใหม่
    let coverImagePath = project.cover_image;
    if (req.file) {
      coverImagePath = `/uploads/${req.file.filename}`;
    } else if (cover_image_url && cover_image_url.trim() !== '') {
      coverImagePath = cover_image_url.trim();
    }

    await pool.query(
      `UPDATE projects 
       SET title = ?, short_description = ?, full_description = ?, cover_image = ?, demo_url = ?, github_url = ?, tags = ?, department = ?
       WHERE id = ?`,
      [
        title ? title.trim() : project.title,
        short_description ? short_description.trim() : project.short_description,
        full_description ? full_description.trim() : project.full_description,
        coverImagePath,
        demo_url !== undefined ? demo_url.trim() : project.demo_url,
        github_url !== undefined ? github_url.trim() : project.github_url,
        tags !== undefined ? tags.trim() : project.tags,
        department !== undefined ? department.trim() : project.department,
        id
      ]
    );

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลโปรเจกต์เรียบร้อยแล้ว!'
    });
  } catch (error) {
    console.error('Update Project Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขโปรเจกต์' });
  }
});

/**
 * @route DELETE /api/projects/:id
 * @desc ลบโปรเจกต์ (เฉพาะ Owner หรือ Admin)
 */
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // ตรวจสอบว่าโปรเจกต์นี้มีอยู่จริงหรือไม่
    const [existing] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบโปรเจกต์ที่ต้องการลบ' });
    }

    const project = existing[0];

    // ตรวจสอบสิทธิ์ (ต้องเป็นเจ้าของผลงาน หรือ เป็น Admin)
    if (project.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ลบผลงานของผู้อื่น' });
    }

    await pool.query('DELETE FROM projects WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'ลบโปรเจกต์ออกจากระบบเรียบร้อยแล้ว!'
    });
  } catch (error) {
    console.error('Delete Project Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบโปรเจกต์' });
  }
});

// Fallback Route ให้บริการ index.html สำหรับ Client SPA Routing
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ------------------------------------------------------------
// 6. START SERVER
// ------------------------------------------------------------
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`============================================================`);
    console.log(`🚀 Department Project Showcase Backend Server Running!`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📁 Static Frontend Served from: ${frontendDir}`);
    console.log(`============================================================`);
    checkDatabaseConnection();
  });
}

module.exports = app;

