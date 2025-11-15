

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration is missing!');
  console.error('Please check your .env file and make sure all Firebase variables are set.');
  console.error('');
  console.error('Required variables:');
  console.error('  - VITE_FIREBASE_API_KEY (or REACT_APP_FIREBASE_API_KEY)');
  console.error('  - VITE_FIREBASE_AUTH_DOMAIN');
  console.error('  - VITE_FIREBASE_PROJECT_ID');
  console.error('  - VITE_FIREBASE_STORAGE_BUCKET');
  console.error('  - VITE_FIREBASE_MESSAGING_SENDER_ID');
  console.error('  - VITE_FIREBASE_APP_ID');
  console.error('');
  console.error('Example .env file:');
  console.error('VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
  console.error('VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com');
  console.error('VITE_FIREBASE_PROJECT_ID=your-project-id');
}

let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized successfully');
  console.log('📦 Project ID:', firebaseConfig.projectId);
} catch (error) {
  console.error('❌ Error initializing Firebase:', error);
  throw error;
}
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

let analytics = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log('✅ Firebase Analytics initialized');
      } else {
        console.log('ℹ️ Firebase Analytics not supported in this environment');
      }
    })
    .catch((error) => {
      console.warn('⚠️ Analytics initialization error:', error.message);
    });
}

export { analytics };
export default app;


if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Firebase Development Mode');
  console.log('Auth Domain:', firebaseConfig.authDomain);
  console.log('Storage Bucket:', firebaseConfig.storageBucket);
}

export const checkFirebaseConnection = async () => {
  try {
    const testResult = {
      auth: !!auth,
      db: !!db,
      storage: !!storage,
      analytics: !!analytics,
      projectId: firebaseConfig.projectId,
      connected: true
    };
    
    console.log('✅ Firebase connection check:', testResult);
    return testResult;
  } catch (error) {
    console.error('❌ Firebase connection check failed:', error);
    return {
      connected: false,
      error: error.message
    };
  }
};

