// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase
const firebaseClient = require('./config/firebase');
const dydxClient = require('./config/dydx');

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Initialize services
async function initializeServices() {
  try {
    await firebaseClient.initialize();
    await dydxClient.initialize();
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Import routes
const marketRoutes = require('./routes/markets');
const userRoutes = require('./routes/user');
const tradingRoutes = require('./routes/trading');
const riskRoutes = require('./routes/risk');

// Routes
app.use('/api/markets', marketRoutes);
app.use('/api/user', userRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/risk', riskRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    firebase: firebaseClient.initialized ? 'connected' : 'disconnected',
    dydx: dydxClient.indexerClient ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
initializeServices().then(() => {
  app.listen(PORT, () => {
    console.log(`Base Perps Pro Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});

module.exports = app;
