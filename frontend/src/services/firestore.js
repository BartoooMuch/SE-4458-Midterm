import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import axios from 'axios';

// Firebase configuration - Replace with your Firebase project config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "your-app-id"
};

let db = null;
let unsubscribe = null;

export const initializeFirestore = async () => {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    return db;
  } catch (error) {
    console.error('Error initializing Firestore:', error);
    throw error;
  }
};

export const sendMessage = async (text) => {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    // Add user message to Firestore
    const userMessage = {
      text: text,
      sender: 'user',
      timestamp: serverTimestamp(),
      status: 'sent'
    };

    await addDoc(collection(db, 'messages'), userMessage);

    // Trigger backend processing via API
    // The backend will process the message and add the response to Firestore
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    await axios.post(`${backendUrl}/api/chat/process`, {
      message: text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const subscribeToMessages = (callback) => {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const messagesRef = collection(db, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  unsubscribe = onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure timestamp is properly formatted
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp || new Date())
      };
    });
    console.log('Firestore messages received:', messages.length);
    callback(messages);
  }, (error) => {
    console.error('Error subscribing to messages:', error);
  });

  return unsubscribe;
};

export const unsubscribeFromMessages = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
};


