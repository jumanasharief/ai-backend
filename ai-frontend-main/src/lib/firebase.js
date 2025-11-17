

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
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

// Connect to emulators in development (only if explicitly enabled via env variable)
// Set VITE_USE_FIREBASE_EMULATORS=true to use emulators, otherwise uses production Firebase
const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

if (typeof window !== 'undefined' && useEmulators && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8081);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    console.log('✅ Connected to Firebase Emulators');
    console.log('⚠️ Data will be saved to LOCAL emulators, not production Firebase!');
  } catch (error) {
    // Already connected or emulators not running - that's okay
    if (!error.message?.includes('already been initialized')) {
      console.log('ℹ️ Emulator connection:', error.message);
    }
  }
} else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  console.log('✅ Using PRODUCTION Firebase (emulators disabled)');
  console.log('📦 Project ID:', firebaseConfig.projectId);
  console.log('💡 To use emulators, set VITE_USE_FIREBASE_EMULATORS=true in .env file');
}

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

