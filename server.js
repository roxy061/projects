// server.js - Fullstack Express REST API Server with Admin Layout Customizer
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

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'project-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพเท่านั้น!'));
    }
  }
});

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน (Unauthorized)' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว (Forbidden)' });
    req.user = user;
    next();
  });
}

// Admin Authorization Guard Middleware
function authenticateAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({
        error: 'ปฏิเสธการเข้าถึง! เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์ใช้งานฟังก์ชันนี้'
      });
    }
  });
}

// ============================================================
// 1. AUTHENTICATION ENDPOINTS
// ============================================================

app.post('/api/register', async (req, res) => {
  let conn;
  try {
    const { username, email, password, full_name, department } = req.body;
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วนทุกช่อง' });
    }

    conn = await pool.getConnection();
    const existing = await conn.query('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1', [username, email]);
    if (existing.length > 0) return res.status(409).json({ error: 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await conn.query(
      'INSERT INTO users (username, email, password, full_name, department, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, full_name, department || 'แผนกเทคโนโลยีสารสนเทศ', 'member']
    );

    const userPayload = {
      id: Number(result.insertId),
      username,
      full_name,
      department: department || 'แผนกเทคโนโลยีสารสนเทศ',
      role: 'member'
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, message: 'สมัครสมาชิกและเข้าสู่ระบบสำเร็จ', token, user: userPayload });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/login', async (req, res) => {
  let conn;
  try {
    const { username, password } = req.body;
    conn = await pool.getConnection();

    const users = await conn.query('SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1', [username, username]);
    if (users.length === 0) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    const userPayload = {
      id: Number(user.id),
      username: user.username,
      full_name: user.full_name,
      department: user.department,
      role: user.role
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ', token, user: userPayload });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ authenticated: true, user: req.user });
});

// ============================================================
// 2. LAYOUT & SITE SETTINGS API (Admin Drag & Drop Customizer)
// ============================================================

// GET /api/settings/layout - Public Layout Structure
app.get('/api/settings/layout', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1', ['homepage_layout']);

    const defaultLayout = [
      { id: "hero", name: "Hero Banner Section", enabled: true },
      { id: "stats", name: "Key Metrics & Department Stats", enabled: true },
      { id: "filter", name: "Search Bar & Category Filter", enabled: true },
      { id: "projects", name: "Project Cards Showcase Grid", enabled: true }
    ];

    if (rows.length > 0 && rows[0].setting_value) {
      res.json({ success: true, layout: JSON.parse(rows[0].setting_value) });
    } else {
      res.json({ success: true, layout: defaultLayout });
    }
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลเลย์เอาต์ได้' });
  } finally {
    if (conn) conn.release();
  }
});

// PUT /api/settings/layout - Save Reordered Layout (Admin Only)
app.put('/api/settings/layout', authenticateAdmin, async (req, res) => {
  let conn;
  try {
    const { layout } = req.body;
    if (!layout || !Array.isArray(layout)) {
      return res.status(400).json({ error: 'รูปแบบข้อมูล Layout ไม่ถูกต้อง' });
    }

    conn = await pool.getConnection();
    await conn.query(
      `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      ['homepage_layout', JSON.stringify(layout)]
    );

    res.json({ success: true, message: 'บันทึกการจัดวางโครงสร้างหน้าเว็บเรียบร้อยแล้ว' });

  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกเลย์เอาต์: ' + err.message });
  } finally {
    if (conn) conn.release();
  }
});

// ============================================================
// 3. PROJECTS CRUD API ENDPOINTS
// ============================================================

app.get('/api/projects', async (req, res) => {
  let conn;
  try {
    const search = req.query.search ? req.query.search.trim() : '';
    const category = req.query.category ? req.query.category.trim() : '';

    conn = await pool.getConnection();
    let sql = `SELECT p.*, u.full_name AS author_name, u.department AS author_department FROM projects p JOIN users u ON p.user_id = u.id WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ` AND (p.title LIKE ? OR p.description LIKE ? OR p.tech_stack LIKE ? OR u.full_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category && category !== 'All') {
      sql += ` AND p.category = ?`;
      params.push(category);
    }
    sql += ` ORDER BY p.created_at DESC`;

    const projects = await conn.query(sql, params);
    res.json({
      success: true,
      count: projects.length,
      projects: projects.map(p => ({ ...p, id: Number(p.id), user_id: Number(p.user_id) }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/projects', authenticateToken, upload.single('cover_image'), async (req, res) => {
  let conn;
  try {
    const { title, description, category, tech_stack, github_url, demo_url } = req.body;
    let image_url = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600');

    conn = await pool.getConnection();
    const result = await conn.query(
      `INSERT INTO projects (user_id, title, description, category, tech_stack, github_url, demo_url, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, description, category || 'Web Application', tech_stack, github_url || null, demo_url || null, image_url]
    );

    res.status(201).json({ success: true, message: 'เพิ่มโปรเจกต์สำเร็จ', id: Number(result.insertId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.put('/api/projects/:id', authenticateToken, upload.single('cover_image'), async (req, res) => {
  let conn;
  try {
    const projectId = req.params.id;
    conn = await pool.getConnection();

    const existing = await conn.query('SELECT user_id, image_url FROM projects WHERE id = ?', [projectId]);
    if (existing.length === 0) return res.status(404).json({ error: 'ไม่พบโปรเจกต์นี้' });

    // STRICT OWNER CHECK (Admin can edit any project if needed, but member can only edit own)
    if (Number(existing[0].user_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'ปฏิเสธการเข้าถึง! คุณไม่มีสิทธิ์แก้ไขโปรเจกต์ของสมาชิกท่านอื่น (Strict Authorization Guard Violation)' });
    }

    let image_url = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url || existing[0].image_url);
    const { title, description, category, tech_stack, github_url, demo_url } = req.body;

    await conn.query(
      `UPDATE projects SET title=?, description=?, category=?, tech_stack=?, github_url=?, demo_url=?, image_url=? WHERE id=?`,
      [title, description, category, tech_stack, github_url || null, demo_url || null, image_url, projectId]
    );

    res.json({ success: true, message: 'แก้ไขโปรเจกต์สำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  let conn;
  try {
    const projectId = req.params.id;
    conn = await pool.getConnection();

    const existing = await conn.query('SELECT user_id FROM projects WHERE id = ?', [projectId]);
    if (existing.length === 0) return res.status(404).json({ error: 'ไม่พบโปรเจกต์นี้' });

    // STRICT OWNER CHECK (Admin can delete any project if needed)
    if (Number(existing[0].user_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'ปฏิเสธการเข้าถึง! คุณไม่มีสิทธิ์ลบโปรเจกต์ของสมาชิกท่านอื่น (Strict Authorization Guard Violation)' });
    }

    await conn.query('DELETE FROM projects WHERE id=?', [projectId]);
    res.json({ success: true, message: 'ลบโปรเจกต์สำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 Express Server running on port ${PORT}`));
