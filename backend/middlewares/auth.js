const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Middleware: Verify Bearer JWT Token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token is missing or invalid. Please login.'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'supersecret_department_project_key_2026_jwt_token', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired access token.'
      });
    }
    req.user = user; // Contains: { id, username, role, full_name }
    next();
  });
}

/**
 * Middleware: Authorize Admin Role Only
 */
function authorizeAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    });
  }
  next();
}

/**
 * Middleware: Authorize Project Owner or Admin
 * Checks project user_id from Database against req.user.id or req.user.role === 'admin'
 */
async function authorizeProjectOwnerOrAdmin(req, res, next) {
  try {
    const projectId = req.params.id || req.body.project_id || req.body.id;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID parameter is missing.'
      });
    }

    // Query project from DB to find owner user_id
    const [rows] = await pool.query('SELECT user_id FROM projects WHERE id = ?', [projectId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    const projectOwnerId = rows[0].user_id;

    // Check if requester is Project Owner OR an Admin
    if (req.user.role === 'admin' || parseInt(projectOwnerId, 10) === parseInt(req.user.id, 10)) {
      req.projectOwnerId = projectOwnerId;
      return next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to modify or delete this project.'
      });
    }
  } catch (error) {
    console.error('Error in authorizeProjectOwnerOrAdmin middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while checking permissions.'
    });
  }
}

module.exports = {
  authenticateToken,
  authorizeAdmin,
  authorizeProjectOwnerOrAdmin
};
