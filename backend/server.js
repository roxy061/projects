const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// Catch uncaught exceptions globally to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const layoutRoutes = require('./routes/layout');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsers with safe payload limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Asset Directories
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/layout', layoutRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Department Project Showcase API',
    uptime: Math.floor(process.uptime()) + ' seconds'
  });
});

// Fallback route to serve frontend SPA/Static pages
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('⚠️ Express Error Handler caught:', err.message || err);
  
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Department Project Showcase Backend Server Running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📂 Static Uploads Path: http://localhost:${PORT}/uploads`);
  console.log(`💻 Frontend App: http://localhost:${PORT}`);
  console.log(`🔑 Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`====================================================`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM signal received: Closing HTTP server...');
  server.close(() => {
    console.log('✅ HTTP server closed cleanly.');
  });
});
