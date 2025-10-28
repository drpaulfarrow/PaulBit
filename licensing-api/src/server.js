const express = require('express');
const cors = require('cors');
const db = require('./db');
const redis = require('./redis');
const authRoutes = require('./routes/auth');
const policyRoutes = require('./routes/policies');
const usageRoutes = require('./routes/usage');
const adminRoutes = require('./routes/admin');
const groundingRoutes = require('./routes/grounding');
const parsedUrlsRoutes = require('./routes/parsed-urls');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/policies', policyRoutes);
app.use('/usage', usageRoutes);
app.use('/admin', adminRoutes);
app.use('/', groundingRoutes);
app.use('/', parsedUrlsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Initialize database and start server
async function start() {
  try {
    await db.initialize();
    console.log('Database initialized');
    
    await redis.initialize();
    console.log('Redis initialized');
    
    app.listen(PORT, () => {
      console.log(`Licensing API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
