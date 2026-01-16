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

// Initialize services independently
async function initializeServices() {
  const results = {
    firebase: false,
    dydx: false
  };

  // Initialize Firebase
  try {
    await firebaseClient.initialize();
    results.firebase = true;
    console.log('✓ Firebase initialized successfully');
  } catch (error) {
    console.error('✗ Failed to initialize Firebase:', error.message);
  }

  // Initialize dYdX (non-blocking - server can start without it)
  try {
    await dydxClient.initialize();
    results.dydx = true;
    console.log('✓ dYdX clients initialized successfully');
  } catch (error) {
    console.error('✗ Failed to initialize dYdX clients:', error.message);
    console.warn('⚠ Server will start without dYdX connection. Some features may be unavailable.');
  }

  return results;
}

// Import routes
const marketRoutes = require('./routes/markets');
const userRoutes = require('./routes/user');
const tradingRoutes = require('./routes/trading');
const riskRoutes = require('./routes/risk');
const stakingRoutes = require('./routes/staking');

// Routes

app.get('/', (req, res) => {
  res.send('Perp Raid API is running.');
});


app.use('/api/markets', marketRoutes);
app.use('/api/user', userRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/staking', stakingRoutes);

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

// Start server (don't wait for all services - start even if some fail)
initializeServices().then((results) => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Base Perps Pro Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Service Status:`);
    console.log(`  - Firebase: ${results.firebase ? '✓ Connected' : '✗ Disconnected'}`);
    console.log(`  - dYdX: ${results.dydx ? '✓ Connected' : '✗ Disconnected'}`);
    console.log('');
  });
}).catch((error) => {
  console.error('Critical error during initialization:', error);
  // Still start the server - Firebase might be working
  app.listen(PORT, () => {
    console.log(`\n🚀 Base Perps Pro Server running on port ${PORT} (with limited functionality)`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});

module.exports = app;
