// server.js - Fullstack Express.js REST API Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_department_projects_2026';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files routes
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// Multer Storage Configuration for Cover Image Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'project-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, GIF) เท่านั้น!'));
    }
  }
});

// ============================================================
// AUTHENTICATION MIDDLEWARE (JWT Verification)
// ============================================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน (Unauthorized)' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว (Forbidden)' });
    }
    req.user = user;
    next();
  });
}

// Optional Auth Middleware (Doesn't block if guest, but attaches req.user if token present)
function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) req.user = user;
      next();
    });
  } else {
    next();
  }
}

// ============================================================
// 1. AUTHENTICATION ENDPOINTS
// ============================================================

// POST /api/register - Register new user
app.post('/api/register', async (req, res) => {
  let conn;
  try {
    const { username, email, password, full_name, department } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วนทุกช่อง' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
    }

    conn = await pool.getConnection();

    // Check duplicate username or email
    const existing = await conn.query(
      'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username.trim(), email.trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้วในระบบ' });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const result = await conn.query(
      'INSERT INTO users (username, email, password, full_name, department) VALUES (?, ?, ?, ?, ?)',
      [username.trim(), email.trim(), hashedPassword, full_name.trim(), department || 'แผนกเทคโนโลยีสารสนเทศ']
    );

    const userId = Number(result.insertId);

    // Generate JWT Token
    const userPayload = {
      id: userId,
      username: username.trim(),
      full_name: full_name.trim(),
      department: department || 'แผนกเทคโนโลยีสารสนเทศ'
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'สมัครสมาชิกและเข้าสู่ระบบเรียบร้อยแล้ว',
      token,
      user: userPayload
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: ' + err.message });
  } finally {
    if (conn) conn.release();
  }
});

// POST /api/login - Login user & return JWT token
app.post('/api/login', async (req, res) => {
  let conn;
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    conn = await pool.getConnection();
    const users = await conn.query(
      'SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username.trim(), username.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = users[0];

    // Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const userPayload = {
      id: Number(user.id),
      username: user.username,
      full_name: user.full_name,
      department: user.department
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: userPayload
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/me - Get Current Logged-in User Profile
app.get('/api/me', authenticateToken, (req, res) => {
  res.json({
    authenticated: true,
    user: req.user
  });
});

// ============================================================
// 2. PROJECTS RESTful API ENDPOINTS
// ============================================================

// GET /api/projects - Get all projects with search & filter (Public Access)
app.get('/api/projects', async (req, res) => {
  let conn;
  try {
    const search = req.query.search ? req.query.search.trim() : '';
    const category = req.query.category ? req.query.category.trim() : '';
    const sort = req.query.sort ? req.query.sort.trim() : 'latest';

    conn = await pool.getConnection();

    let sql = `
      SELECT p.*, u.full_name AS author_name, u.username AS author_username, u.department AS author_department
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (p.title LIKE ? OR p.description LIKE ? OR p.tech_stack LIKE ? OR u.full_name LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (category && category !== 'All') {
      sql += ` AND p.category = ?`;
      params.push(category);
    }

    if (sort === 'oldest') {
      sql += ` ORDER BY p.created_at ASC`;
    } else {
      sql += ` ORDER BY p.created_at DESC`;
    }

    const projects = await conn.query(sql, params);

    // Format BigInt/IDs safely
    const formattedProjects = projects.map(p => ({
      ...p,
      id: Number(p.id),
      user_id: Number(p.user_id)
    }));

    res.json({
      success: true,
      count: formattedProjects.length,
      projects: formattedProjects
    });

  } catch (err) {
    console.error('Fetch projects error:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลโปรเจกต์ได้' });
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/projects/:id - Get single project details (Public Access)
app.get('/api/projects/:id', async (req, res) => {
  let conn;
  try {
    const projectId = req.params.id;
    conn = await pool.getConnection();

    const sql = `
      SELECT p.*, u.full_name AS author_name, u.username AS author_username, u.department AS author_department
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;
    const projects = await conn.query(sql, [projectId]);

    if (projects.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลโปรเจกต์นี้' });
    }

    const project = {
      ...projects[0],
      id: Number(projects[0].id),
      user_id: Number(projects[0].user_id)
    };

    res.json({ success: true, project });

  } catch (err) {
    console.error('Fetch project detail error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรเจกต์' });
  } finally {
    if (conn) conn.release();
  }
});

// POST /api/projects - Create new project (Authenticated Members Only)
app.post('/api/projects', authenticateToken, upload.single('cover_image'), async (req, res) => {
  let conn;
  try {
    const { title, description, category, tech_stack, github_url, demo_url } = req.body;

    if (!title || !description || !tech_stack) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อโปรเจกต์ รายละเอียด และ Tech Stack' });
    }

    // Handle image path from Multer or fallback URL
    let image_url = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=60';
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    } else if (req.body.image_url) {
      image_url = req.body.image_url;
    }

    conn = await pool.getConnection();

    const sql = `
      INSERT INTO projects (user_id, title, description, category, tech_stack, github_url, demo_url, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await conn.query(sql, [
      req.user.id,
      title.trim(),
      description.trim(),
      category || 'Web Application',
      tech_stack.trim(),
      github_url ? github_url.trim() : null,
      demo_url ? demo_url.trim() : null,
      image_url
    ]);

    res.status(201).json({
      success: true,
      message: 'อัปโหลดและเพิ่มโปรเจกต์สำเร็จเรียบร้อยแล้ว',
      id: Number(result.insertId)
    });

  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกโปรเจกต์: ' + err.message });
  } finally {
    if (conn) conn.release();
  }
});

// PUT /api/projects/:id - Update project (STRICT AUTHORIZATION GUARD)
app.put('/api/projects/:id', authenticateToken, upload.single('cover_image'), async (req, res) => {
  let conn;
  try {
    const projectId = req.params.id;
    const { title, description, category, tech_stack, github_url, demo_url } = req.body;

    conn = await pool.getConnection();

    // 1. Check if project exists
    const existing = await conn.query('SELECT user_id, image_url FROM projects WHERE id = ?', [projectId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโปรเจกต์ที่ต้องการแก้ไข' });
    }

    const projectOwnerId = Number(existing[0].user_id);
    const currentUserId = Number(req.user.id);

    // 2. STRICT AUTHORIZATION GUARD CHECK
    if (projectOwnerId !== currentUserId) {
      return res.status(403).json({
        error: 'ปฏิเสธการเข้าถึง! คุณไม่มีสิทธิ์แก้ไขโปรเจกต์ของสมาชิกท่านอื่น (Strict Authorization Guard Violation)'
      });
    }

    // Determine cover image URL
    let image_url = existing[0].image_url;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    } else if (req.body.image_url) {
      image_url = req.body.image_url;
    }

    const sql = `
      UPDATE projects SET
        title = ?,
        description = ?,
        category = ?,
        tech_stack = ?,
        github_url = ?,
        demo_url = ?,
        image_url = ?
      WHERE id = ? AND user_id = ?
    `;
    await conn.query(sql, [
      title.trim(),
      description.trim(),
      category || 'Web Application',
      tech_stack.trim(),
      github_url ? github_url.trim() : null,
      demo_url ? demo_url.trim() : null,
      image_url,
      projectId,
      currentUserId
    ]);

    res.json({
      success: true,
      message: 'แก้ไขข้อมูลโปรเจกต์เรียบร้อยแล้ว'
    });

  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไขโปรเจกต์' });
  } finally {
    if (conn) conn.release();
  }
});

// DELETE /api/projects/:id - Delete project (STRICT AUTHORIZATION GUARD)
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  let conn;
  try {
    const projectId = req.params.id;
    conn = await pool.getConnection();

    // 1. Check if project exists & verify owner
    const existing = await conn.query('SELECT user_id FROM projects WHERE id = ?', [projectId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโปรเจกต์ที่ต้องการลบ' });
    }

    const projectOwnerId = Number(existing[0].user_id);
    const currentUserId = Number(req.user.id);

    // 2. STRICT AUTHORIZATION GUARD CHECK
    if (projectOwnerId !== currentUserId) {
      return res.status(403).json({
        error: 'ปฏิเสธการเข้าถึง! คุณไม่มีสิทธิ์ลบโปรเจกต์ของสมาชิกท่านอื่น (Strict Authorization Guard Violation)'
      });
    }

    await conn.query('DELETE FROM projects WHERE id = ? AND user_id = ?', [projectId, currentUserId]);

    res.json({
      success: true,
      message: 'ลบโปรเจกต์เรียบร้อยแล้ว'
    });

  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบโปรเจกต์' });
  } finally {
    if (conn) conn.release();
  }
});

// Global Error Handler for Multer & Express
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'ขนาดไฟล์เกินขีดจำกัด (สูงสุด 5MB): ' + err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// Fallback route for Single Page App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
