const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth');

// Default fallback layout structure if database row is missing
const DEFAULT_LAYOUT = [
  { id: 'hero', name: 'Hero Section', enabled: true, title: 'Department Project Showcase', subtitle: 'คลังรวบรวมและนำเสนอผลงานโปรเจกต์นวัตกรรมประจำภาควิชา' },
  { id: 'stats', name: 'System Statistics', enabled: true },
  { id: 'filter', name: 'Search & Tag Filters', enabled: true },
  { id: 'projects', name: 'Projects Showcase Grid', enabled: true },
  { id: 'featured', name: 'Featured Highlights', enabled: true },
  { id: 'about', name: 'Department Info', enabled: true }
];

/**
 * @route   GET /api/layout
 * @desc    Fetch site UI section layout JSON structure for homepage rendering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT structure_json FROM site_layouts WHERE layout_name = ?',
      ['default']
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        layout: DEFAULT_LAYOUT
      });
    }

    let parsedStructure;
    try {
      parsedStructure = typeof rows[0].structure_json === 'string' 
        ? JSON.parse(rows[0].structure_json) 
        : rows[0].structure_json;
    } catch (e) {
      parsedStructure = DEFAULT_LAYOUT;
    }

    res.json({
      success: true,
      layout: parsedStructure
    });
  } catch (error) {
    console.error('Error fetching layout configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve site layout configuration.',
      layout: DEFAULT_LAYOUT
    });
  }
});

/**
 * @route   PUT /api/layout
 * @desc    Update site UI layout JSON structure (Admin Only)
 * @access  Private (Admin Only)
 */
router.put('/', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { structure } = req.body;

    if (!structure || !Array.isArray(structure)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. "structure" must be an array of layout section items.'
      });
    }

    const jsonString = JSON.stringify(structure);

    // Upsert query for 'default' layout name
    await pool.query(
      `INSERT INTO site_layouts (layout_name, structure_json) 
       VALUES ('default', ?) 
       ON DUPLICATE KEY UPDATE structure_json = VALUES(structure_json)`,
      [jsonString]
    );

    res.json({
      success: true,
      message: 'Site layout configuration saved successfully!',
      layout: structure
    });
  } catch (error) {
    console.error('Error saving layout configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save site layout configuration.'
    });
  }
});

module.exports = router;
