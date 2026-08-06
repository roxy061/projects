const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../config/db');
const { authenticateToken, authorizeProjectOwnerOrAdmin } = require('../middlewares/auth');

// Multer Storage Configuration for uploaded cover images
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'cover-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimeMatch = allowedTypes.test(file.mimetype);
    const extMatch = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimeMatch && extMatch) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed!'));
  }
});

/**
 * Helper function: Link/insert tags for a project
 */
async function attachTagsToProject(projectId, tagsInput) {
  if (!tagsInput) return;

  let tagList = [];
  if (Array.isArray(tagsInput)) {
    tagList = tagsInput;
  } else if (typeof tagsInput === 'string') {
    // Split by comma or space if formatted as string
    try {
      const parsed = JSON.parse(tagsInput);
      if (Array.isArray(parsed)) tagList = parsed;
      else tagList = tagsInput.split(',');
    } catch (e) {
      tagList = tagsInput.split(',');
    }
  }

  // Clean tags
  tagList = tagList.map(t => t.trim()).filter(t => t.length > 0);

  // Clear existing project tags first
  await pool.query('DELETE FROM project_tags WHERE project_id = ?', [projectId]);

  for (const tagName of tagList) {
    // Insert tag if not exists
    await pool.query('INSERT IGNORE INTO tags (name) VALUES (?)', [tagName]);
    
    // Get tag ID
    const [rows] = await pool.query('SELECT id FROM tags WHERE name = ?', [tagName]);
    if (rows.length > 0) {
      const tagId = rows[0].id;
      // Map to project
      await pool.query(
        'INSERT IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)',
        [projectId, tagId]
      );
    }
  }
}

/**
 * @route   GET /api/projects
 * @desc    Get all projects with search query, tag filter, and pagination
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { search, tag, page = 1, limit = 9 } = req.query;

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const itemsPerPage = Math.max(1, parseInt(limit, 10) || 9);
    const offset = (currentPage - 1) * itemsPerPage;

    let baseQuery = `
      SELECT DISTINCT p.id, p.user_id, p.title, p.short_description, p.full_description, 
             p.cover_image_url, p.demo_url, p.github_url, p.created_at, p.updated_at,
             u.full_name as author_name, u.username as author_username
      FROM projects p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN project_tags pt ON p.id = pt.project_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE 1=1
    `;

    const queryParams = [];

    // Search filter (title or description)
    if (search && search.trim() !== '') {
      baseQuery += ` AND (p.title LIKE ? OR p.short_description LIKE ? OR p.full_description LIKE ?)`;
      const term = `%${search.trim()}%`;
      queryParams.push(term, term, term);
    }

    // Tag filter
    if (tag && tag.trim() !== '') {
      baseQuery += ` AND t.name = ?`;
      queryParams.push(tag.trim());
    }

    // Count Total Results
    const countSql = `SELECT COUNT(DISTINCT p.id) as total FROM (${baseQuery}) AS filtered_projects`;
    // Build query for count
    const [countResult] = await pool.query(
      `SELECT COUNT(DISTINCT p.id) as total 
       FROM projects p 
       JOIN users u ON p.user_id = u.id 
       LEFT JOIN project_tags pt ON p.id = pt.project_id 
       LEFT JOIN tags t ON pt.tag_id = t.id 
       WHERE 1=1 
       ${search ? 'AND (p.title LIKE ? OR p.short_description LIKE ? OR p.full_description LIKE ?)' : ''}
       ${tag ? 'AND t.name = ?' : ''}`,
      queryParams
    );

    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Add Order by & Pagination
    baseQuery += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(itemsPerPage, offset);

    const [projects] = await pool.query(baseQuery, queryParams);

    // Fetch tags for each project
    for (let project of projects) {
      const [tags] = await pool.query(
        `SELECT t.id, t.name 
         FROM tags t 
         JOIN project_tags pt ON t.id = pt.tag_id 
         WHERE pt.project_id = ?`,
        [project.id]
      );
      project.tags = tags.map(t => t.name);
    }

    res.json({
      success: true,
      data: projects,
      pagination: {
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch projects list.' });
  }
});

/**
 * @route   GET /api/projects/tags/all
 * @desc    Get list of all existing tags with count
 * @access  Public
 */
router.get('/tags/all', async (req, res) => {
  try {
    const [tags] = await pool.query(`
      SELECT t.id, t.name, COUNT(pt.project_id) as project_count
      FROM tags t
      LEFT JOIN project_tags pt ON t.id = pt.tag_id
      GROUP BY t.id, t.name
      ORDER BY project_count DESC, t.name ASC
    `);

    res.json({
      success: true,
      tags
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tag list.' });
  }
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project details by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const projectId = req.params.id;

    const [rows] = await pool.query(
      `SELECT p.id, p.user_id, p.title, p.short_description, p.full_description, 
              p.cover_image_url, p.demo_url, p.github_url, p.created_at, p.updated_at,
              u.full_name as author_name, u.username as author_username, u.email as author_email
       FROM projects p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [projectId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const project = rows[0];

    // Fetch project tags
    const [tags] = await pool.query(
      `SELECT t.id, t.name 
       FROM tags t 
       JOIN project_tags pt ON t.id = pt.tag_id 
       WHERE pt.project_id = ?`,
      [project.id]
    );

    project.tags = tags.map(t => t.name);

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Error fetching project detail:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project details.' });
  }
});

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private (Authenticated Members / Admins)
 */
router.post('/', authenticateToken, upload.single('cover_image'), async (req, res) => {
  try {
    const { title, short_description, full_description, demo_url, github_url, cover_image_url, tags } = req.body;
    const userId = req.user.id;

    if (!title || !short_description || !full_description) {
      return res.status(400).json({
        success: false,
        message: 'Title, short description, and full description are required.'
      });
    }

    // Determine cover image URL (uploaded file priority over image URL string)
    let finalCoverUrl = cover_image_url || null;
    if (req.file) {
      finalCoverUrl = `/uploads/${req.file.filename}`;
    }

    // Fallback default image if none provided
    if (!finalCoverUrl) {
      finalCoverUrl = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000&auto=format&fit=crop';
    }

    // Insert project into database
    const [result] = await pool.query(
      `INSERT INTO projects (user_id, title, short_description, full_description, cover_image_url, demo_url, github_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, title.trim(), short_description.trim(), full_description.trim(), finalCoverUrl, demo_url || null, github_url || null]
    );

    const projectId = result.insertId;

    // Attach tags
    if (tags) {
      await attachTagsToProject(projectId, tags);
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully!',
      projectId
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ success: false, message: 'Failed to create project.' });
  }
});

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project (Protected: Owner or Admin only)
 * @access  Private
 */
router.put('/:id', authenticateToken, authorizeProjectOwnerOrAdmin, upload.single('cover_image'), async (req, res) => {
  try {
    const projectId = req.params.id;
    const { title, short_description, full_description, demo_url, github_url, cover_image_url, tags } = req.body;

    if (!title || !short_description || !full_description) {
      return res.status(400).json({
        success: false,
        message: 'Title, short description, and full description are required.'
      });
    }

    // Get current image url if no new one provided
    let finalCoverUrl = cover_image_url;
    if (req.file) {
      finalCoverUrl = `/uploads/${req.file.filename}`;
    }

    if (!finalCoverUrl) {
      const [existing] = await pool.query('SELECT cover_image_url FROM projects WHERE id = ?', [projectId]);
      if (existing.length > 0) {
        finalCoverUrl = existing[0].cover_image_url;
      }
    }

    await pool.query(
      `UPDATE projects 
       SET title = ?, short_description = ?, full_description = ?, cover_image_url = ?, demo_url = ?, github_url = ?
       WHERE id = ?`,
      [title.trim(), short_description.trim(), full_description.trim(), finalCoverUrl, demo_url || null, github_url || null, projectId]
    );

    // Update Tags
    if (tags !== undefined) {
      await attachTagsToProject(projectId, tags);
    }

    res.json({
      success: true,
      message: 'Project updated successfully.'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, message: 'Failed to update project.' });
  }
});

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project (Protected: Owner or Admin only)
 * @access  Private
 */
router.delete('/:id', authenticateToken, authorizeProjectOwnerOrAdmin, async (req, res) => {
  try {
    const projectId = req.params.id;

    const [result] = await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, message: 'Failed to delete project.' });
  }
});

module.exports = router;
