const admin = require('firebase-admin');

class FirebaseClient {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize Firebase Admin SDK
      if (!admin.apps.length) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : null;

        if (serviceAccount) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
          });
        } else if (process.env.FIREBASE_PROJECT_ID) {
          // For environments like Google Cloud Run where credentials are auto-detected
          admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID
          });
        } else {
          throw new Error('Firebase configuration not found. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID');
        }
      }

      this.db = admin.firestore();
      this.initialized = true;
      console.log('Firebase Admin initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }

  getFirestore() {
    if (!this.initialized || !this.db) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // User Balance Collection
  async saveUserBalance(walletAddress, balanceData) {
    const db = this.getFirestore();
    const docRef = db.collection('user_balances').doc(walletAddress.toLowerCase());
    await docRef.set({
      ...balanceData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return docRef.id;
  }

  async getUserBalance(walletAddress) {
    const db = this.getFirestore();
    const doc = await db.collection('user_balances').doc(walletAddress.toLowerCase()).get();
    return doc.exists ? doc.data() : null;
  }

  // Positions Collection
  async savePosition(walletAddress, positionId, positionData) {
    const db = this.getFirestore();
    const docRef = db.collection('positions')
      .doc(`${walletAddress.toLowerCase()}_${positionId}`);
    await docRef.set({
      wallet_address: walletAddress.toLowerCase(),
      ...positionData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return docRef.id;
  }

  async getUserPositions(walletAddress) {
    const db = this.getFirestore();
    const snapshot = await db.collection('positions')
      .where('wallet_address', '==', walletAddress.toLowerCase())
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async deletePosition(walletAddress, positionId) {
    const db = this.getFirestore();
    await db.collection('positions')
      .doc(`${walletAddress.toLowerCase()}_${positionId}`)
      .delete();
  }

  // Trade History Collection
  async saveTrade(walletAddress, tradeId, tradeData) {
    const db = this.getFirestore();
    const docRef = db.collection('trade_history')
      .doc(`${walletAddress.toLowerCase()}_${tradeId}`);
    await docRef.set({
      wallet_address: walletAddress.toLowerCase(),
      ...tradeData,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  }

  async getUserTradeHistory(walletAddress, limit = 50) {
    const db = this.getFirestore();
    const snapshot = await db.collection('trade_history')
      .where('wallet_address', '==', walletAddress.toLowerCase())
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Market Data Collection
  async saveMarketData(market, marketData) {
    const db = this.getFirestore();
    const docRef = db.collection('market_data').doc(market);
    await docRef.set({
      ...marketData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return docRef.id;
  }

  async getMarketData(market) {
    const db = this.getFirestore();
    const doc = await db.collection('market_data').doc(market).get();
    return doc.exists ? doc.data() : null;
  }

  async getAllMarkets() {
    const db = this.getFirestore();
    const snapshot = await db.collection('market_data').get();
    return snapshot.docs.map(doc => ({ market: doc.id, ...doc.data() }));
  }

  // Order Book Collection
  async saveOrderBook(market, orderBookData) {
    const db = this.getFirestore();
    const docRef = db.collection('orderbooks').doc(market);
    await docRef.set({
      ...orderBookData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return docRef.id;
  }

  async getOrderBook(market) {
    const db = this.getFirestore();
    const doc = await db.collection('orderbooks').doc(market).get();
    return doc.exists ? doc.data() : null;
  }

  // Risk Metrics Collection
  async saveRiskMetrics(walletAddress, riskData) {
    const db = this.getFirestore();
    const docRef = db.collection('risk_metrics').doc(walletAddress.toLowerCase());
    await docRef.set({
      ...riskData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return docRef.id;
  }

  async getRiskMetrics(walletAddress) {
    const db = this.getFirestore();
    const doc = await db.collection('risk_metrics').doc(walletAddress.toLowerCase()).get();
    return doc.exists ? doc.data() : null;
  }

  // Transactions Collection
  async saveTransaction(walletAddress, txHash, transactionData) {
    const db = this.getFirestore();
    const docRef = db.collection('transactions')
      .doc(`${walletAddress.toLowerCase()}_${txHash}`);
    await docRef.set({
      wallet_address: walletAddress.toLowerCase(),
      ...transactionData,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  }

  async getUserTransactions(walletAddress, limit = 50) {
    const db = this.getFirestore();
    const snapshot = await db.collection('transactions')
      .where('wallet_address', '==', walletAddress.toLowerCase())
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Orders Collection (for tracking open orders)
  async saveOrder(walletAddress, orderId, orderData) {
    const db = this.getFirestore();
    const docRef = db.collection('orders')
      .doc(`${walletAddress.toLowerCase()}_${orderId}`);
    await docRef.set({
      wallet_address: walletAddress.toLowerCase(),
      ...orderData,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return docRef.id;
  }

  async getUserOrders(walletAddress) {
    const db = this.getFirestore();
    const snapshot = await db.collection('orders')
      .where('wallet_address', '==', walletAddress.toLowerCase())
      .where('status', 'in', ['pending', 'open'])
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async updateOrderStatus(walletAddress, orderId, status) {
    const db = this.getFirestore();
    await db.collection('orders')
      .doc(`${walletAddress.toLowerCase()}_${orderId}`)
      .update({
        status,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
  }
}

const firebaseClient = new FirebaseClient();
module.exports = firebaseClient;
