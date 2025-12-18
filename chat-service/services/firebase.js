const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

let db = null;

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      db = admin.firestore();
      logger.info('Firebase Admin already initialized');
      return db;
    }

    // Initialize with service account or use default credentials
    // Option 1: Use service account key file
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } 
    // Option 2: Use environment variables
    else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        })
      });
    }
    // Option 3: Use default credentials (for local development with Firebase emulator)
    else {
      logger.warn('No Firebase credentials found, using default credentials');
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'your-project-id'
      });
    }

    db = admin.firestore();
    logger.info('Firebase Admin initialized successfully');
    return db;
  } catch (error) {
    logger.error('Error initializing Firebase Admin', { error: error.message });
    throw error;
  }
};

/**
 * Add message to Firestore
 */
const addMessage = async (text, sender = 'agent', metadata = {}) => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const message = {
      text: text,
      sender: sender,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ...metadata
    };

    const docRef = await db.collection('messages').add(message);
    logger.info('Message added to Firestore', { docId: docRef.id, sender });
    return docRef.id;
  } catch (error) {
    logger.error('Error adding message to Firestore', { error: error.message });
    throw error;
  }
};

module.exports = {
  initializeFirebase,
  addMessage,
  getDb: () => db
};


