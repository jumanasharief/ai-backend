# Migration Guide: LocalStorage to Firebase

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Firebase Project Setup](#firebase-project-setup)
4. [Database Structure](#database-structure)
5. [Authentication Setup](#authentication-setup)
6. [Installing Dependencies](#installing-dependencies)
7. [Firebase Configuration](#firebase-configuration)
8. [Context Migration](#context-migration)
9. [Data Migration Utility](#data-migration-utility)
10. [Real-time Features](#real-time-features)
11. [File Storage Setup](#file-storage-setup)
12. [Security Rules](#security-rules)
13. [Best Practices](#best-practices)
14. [Cost Considerations](#cost-considerations)

---

## Overview

This guide walks you through migrating from localStorage-based data management to Firebase, Google's comprehensive app development platform. Firebase provides:

- **Cloud Firestore**: NoSQL document database
- **Firebase Authentication**: Multiple auth providers (Email/Password, Google, GitHub, Facebook, etc.)
- **Real-time Database**: Optional real-time synchronization
- **Cloud Storage**: File upload/download for images and files
- **Cloud Functions**: Serverless backend logic (optional)
- **Analytics**: Built-in app analytics

---

## Prerequisites

- Node.js and npm/yarn installed
- Existing React application with localStorage contexts
- Google account for Firebase Console
- Basic understanding of NoSQL databases and React hooks

---

## Firebase Project Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project details:
   - **Project name**: ai-coach-app
   - **Enable Google Analytics**: Optional (recommended)
   - Choose or create Analytics account
4. Click "Create Project"

### 2. Register Your Web App

1. In your Firebase project, click the web icon `</>`
2. Register your app:
   - **App nickname**: ai-coach-web
   - **Firebase Hosting**: Optional (check if you plan to host on Firebase)
3. Copy the Firebase configuration object (we'll use this later)

### 3. Get Your Firebase Config

After registration, you'll see your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "ai-coach-app.firebaseapp.com",
  projectId: "ai-coach-app",
  storageBucket: "ai-coach-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};
```

---

## Database Structure

### Firestore Data Model

Firestore is a NoSQL document database organized into collections and documents:

```
users (collection)
  └─ {userId} (document)
      ├─ email: string
      ├─ name: string
      ├─ gender: string
      ├─ birthdate: string
      ├─ age: number
      ├─ profilePictureUrl: string
      ├─ hasCompletedOnboarding: boolean
      ├─ createdAt: timestamp
      └─ updatedAt: timestamp

goals (collection)
  └─ {userId} (document)
      ├─ userId: string
      ├─ currentWeight: number
      ├─ goalWeight: number
      ├─ initialWeight: number
      ├─ goalType: string
      ├─ createdAt: timestamp
      └─ updatedAt: timestamp

weightHistory (collection)
  └─ {userId} (document)
      └─ entries (subcollection)
          └─ {entryId} (document)
              ├─ weight: number
              ├─ recordedDate: string
              └─ createdAt: timestamp

workouts (collection)
  └─ {workoutId} (document)
      ├─ userId: string
      ├─ exercise: string
      ├─ level: string
      ├─ durationMs: number
      ├─ reps: number
      ├─ calories: number
      ├─ accuracy: number
      ├─ workoutDate: timestamp
      └─ createdAt: timestamp
```

### Create Collections in Firebase Console

1. Go to **Firestore Database** in Firebase Console
2. Click "Create database"
3. Choose **Start in test mode** (we'll add security rules later)
4. Select a Cloud Firestore location (choose closest to your users)
5. Click "Enable"

Collections will be created automatically when you insert the first document.

---

## Authentication Setup

### Enable Authentication Methods

1. Go to **Authentication** in Firebase Console
2. Click "Get Started"
3. Go to **Sign-in method** tab
4. Enable authentication providers:

#### Email/Password Authentication

1. Click "Email/Password"
2. Enable "Email/Password"
3. Optionally enable "Email link (passwordless sign-in)"
4. Click "Save"

#### Google Authentication (Optional)

1. Click "Google"
2. Enable toggle
3. Select a support email
4. Click "Save"

#### Other Providers (Optional)

- GitHub, Facebook, Twitter, Apple, Microsoft, Yahoo, etc.
- Each requires setting up OAuth apps in respective platforms

### Configure Email Templates (Optional)

1. Go to **Authentication** → **Templates**
2. Customize email templates for:
   - Email verification
   - Password reset
   - Email address change
   - SMS verification

---

## Installing Dependencies

```bash
# Install Firebase SDK
npm install firebase

# Optional: For easier state management with Firebase
npm install react-firebase-hooks
```

---

## Firebase Configuration

### 1. Create Firebase Config File

Create `src/lib/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics (only in production)
let analytics = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  analytics = getAnalytics(app);
}
export { analytics };

// Connect to emulators in development (optional)
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  console.log('Connected to Firebase Emulators');
}

export default app;
```

### 2. Environment Variables

Create `.env` file in your project root:

```env
# Vite (if using Vite)
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=ai-coach-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-coach-app
VITE_FIREBASE_STORAGE_BUCKET=ai-coach-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Create React App (if using CRA)
REACT_APP_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=ai-coach-app.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=ai-coach-app
REACT_APP_FIREBASE_STORAGE_BUCKET=ai-coach-app.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional: Enable emulators in development
REACT_APP_USE_FIREBASE_EMULATOR=false
```

**Important**: Add `.env` to `.gitignore`!

---

## Context Migration

### 1. UserContext Migration

Create `src/context/UserContext.jsx`:

```javascript
import { createContext, useState, useEffect, useContext } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile as updateAuthProfile
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Load user profile from Firestore
        await loadProfile(firebaseUser.uid);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load user profile from Firestore
  const loadProfile = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        setProfile(userDoc.data());
      } else {
        // Create initial profile if doesn't exist
        const initialProfile = {
          email: auth.currentUser?.email || '',
          name: auth.currentUser?.displayName || '',
          gender: '',
          birthdate: '',
          age: null,
          profilePictureUrl: auth.currentUser?.photoURL || null,
          hasCompletedOnboarding: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(doc(db, 'users', userId), initialProfile);
        setProfile(initialProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, userData = {}) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        name: userData.name || '',
        gender: userData.gender || '',
        birthdate: userData.birthdate || '',
        age: userData.age || null,
        profilePictureUrl: null,
        hasCompletedOnboarding: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update display name if provided
      if (userData.name) {
        await updateAuthProfile(user, { displayName: userData.name });
      }

      return { user, error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      return { user: null, error };
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { user: null, error };
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if profile exists, if not create it
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          name: user.displayName || '',
          gender: '',
          birthdate: '',
          age: null,
          profilePictureUrl: user.photoURL || null,
          hasCompletedOnboarding: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      return { user, error: null };
    } catch (error) {
      console.error('Error signing in with Google:', error);
      return { user: null, error };
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Update user profile
  const updateUser = async (userData) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setProfile(prev => ({
        ...prev,
        ...userData
      }));

      // Update auth profile if name changed
      if (userData.name) {
        await updateAuthProfile(user, { displayName: userData.name });
      }

      return { error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error };
    }
  };

  // Mark onboarding as complete
  const markOnboardingComplete = async () => {
    return await updateUser({ hasCompletedOnboarding: true });
  };

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    updateUser,
    markOnboardingComplete
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

export default UserContext;
```

### 2. GoalsContext Migration

Create `src/context/GoalsContext.jsx`:

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUser } from './UserContext';

const GoalsContext = createContext();

export const useGoals = () => {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
};

export const GoalsProvider = ({ children }) => {
  const { user, isAuthenticated } = useUser();
  const [currentWeight, setCurrentWeight] = useState(null);
  const [goalWeight, setGoalWeight] = useState(null);
  const [initialWeight, setInitialWeight] = useState(null);
  const [weightHistory, setWeightHistory] = useState([]);
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(true);

  // Load goals data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadGoalsData();
      loadWeightHistory();
    } else {
      // Reset state when logged out
      setCurrentWeight(null);
      setGoalWeight(null);
      setInitialWeight(null);
      setWeightHistory([]);
      setGoal('');
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Load goals from Firestore
  const loadGoalsData = async () => {
    try {
      const goalsDoc = await getDoc(doc(db, 'goals', user.uid));
      
      if (goalsDoc.exists()) {
        const data = goalsDoc.data();
        setCurrentWeight(data.currentWeight || null);
        setGoalWeight(data.goalWeight || null);
        setInitialWeight(data.initialWeight || null);
        setGoal(data.goalType || '');
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load weight history from Firestore
  const loadWeightHistory = async () => {
    try {
      const historyRef = collection(db, 'weightHistory', user.uid, 'entries');
      const q = query(historyRef, orderBy('recordedDate', 'desc'), limit(7));
      const querySnapshot = await getDocs(q);

      const history = [];
      querySnapshot.forEach((doc) => {
        history.push({
          id: doc.id,
          date: doc.data().recordedDate,
          weight: doc.data().weight
        });
      });

      setWeightHistory(history);
    } catch (error) {
      console.error('Error loading weight history:', error);
    }
  };

  // Update current weight
  const updateCurrentWeight = async (weight, date = null) => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated');
    }

    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      throw new Error('Weight must be a positive number');
    }

    try {
      // Update goals document
      const goalsRef = doc(db, 'goals', user.uid);
      await setDoc(goalsRef, {
        userId: user.uid,
        currentWeight: weightValue,
        goalWeight: goalWeight,
        initialWeight: initialWeight,
        goalType: goal,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setCurrentWeight(weightValue);

      // Add to weight history if date provided
      if (date) {
        const entryDate = date || new Date().toISOString().split('T')[0];
        const historyRef = collection(db, 'weightHistory', user.uid, 'entries');
        
        await addDoc(historyRef, {
          weight: weightValue,
          recordedDate: entryDate,
          createdAt: serverTimestamp()
        });

        // Reload history
        await loadWeightHistory();
      }
    } catch (error) {
      console.error('Error updating weight:', error);
      throw error;
    }
  };

  // Update goal weight
  const updateGoalWeight = async (weight) => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated');
    }

    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      throw new Error('Goal weight must be a positive number');
    }

    if (weightValue < 30 || weightValue > 300) {
      throw new Error('Goal weight must be between 30kg and 300kg');
    }

    try {
      const goalsRef = doc(db, 'goals', user.uid);
      await setDoc(goalsRef, {
        userId: user.uid,
        goalWeight: weightValue,
        currentWeight: currentWeight,
        initialWeight: initialWeight,
        goalType: goal,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setGoalWeight(weightValue);
    } catch (error) {
      console.error('Error updating goal weight:', error);
      throw error;
    }
  };

  // Set initial weight
  const setInitialWeightValue = async (weight) => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated');
    }

    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      throw new Error('Initial weight must be a positive number');
    }

    try {
      const goalsRef = doc(db, 'goals', user.uid);
      await setDoc(goalsRef, {
        userId: user.uid,
        initialWeight: weightValue,
        currentWeight: weightValue,
        goalWeight: goalWeight,
        goalType: goal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      setInitialWeight(weightValue);
      setCurrentWeight(weightValue);
    } catch (error) {
      console.error('Error setting initial weight:', error);
      throw error;
    }
  };

  // Update goal type
  const updateGoal = async (goalType) => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated');
    }

    try {
      const goalsRef = doc(db, 'goals', user.uid);
      await setDoc(goalsRef, {
        userId: user.uid,
        goalType: goalType,
        currentWeight: currentWeight,
        goalWeight: goalWeight,
        initialWeight: initialWeight,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setGoal(goalType);
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  };

  // Calculate progress
  const calculateProgress = () => {
    if (!currentWeight || !goalWeight || !initialWeight) return 0;

    // For weight LOSS goals
    if (goalWeight < initialWeight) {
      const totalWeightToLose = initialWeight - goalWeight;
      const weightLostSoFar = initialWeight - currentWeight;

      if (totalWeightToLose <= 0) return 100;

      const progress = (weightLostSoFar / totalWeightToLose) * 100;
      return Math.min(Math.max(progress, 0), 100);
    }

    // For weight GAIN goals
    if (goalWeight > initialWeight) {
      const totalWeightToGain = goalWeight - initialWeight;
      const weightGainedSoFar = currentWeight - initialWeight;

      if (totalWeightToGain <= 0) return 100;

      const progress = (weightGainedSoFar / totalWeightToGain) * 100;
      return Math.min(Math.max(progress, 0), 100);
    }

    return 100;
  };

  // Reset goals
  const resetGoals = async () => {
    if (!isAuthenticated) return;

    try {
      // Delete goals document
      await deleteDoc(doc(db, 'goals', user.uid));

      // Delete all weight history entries
      const historyRef = collection(db, 'weightHistory', user.uid, 'entries');
      const querySnapshot = await getDocs(historyRef);
      
      const deletePromises = [];
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);

      setCurrentWeight(null);
      setGoalWeight(null);
      setInitialWeight(null);
      setWeightHistory([]);
      setGoal('');
    } catch (error) {
      console.error('Error resetting goals:', error);
      throw error;
    }
  };

  const getWeightHistory = () => weightHistory;

  const value = {
    currentWeight,
    goalWeight,
    initialWeight,
    weightHistory,
    goal,
    loading,
    progress: calculateProgress(),
    updateCurrentWeight,
    updateGoalWeight,
    setInitialWeightValue,
    updateGoal,
    getWeightHistory,
    resetGoals,
    calculateProgress
  };

  return (
    <GoalsContext.Provider value={value}>
      {children}
    </GoalsContext.Provider>
  );
};
```

### 3. WorkoutContext Migration

Create `src/context/WorkoutContext.jsx`:

```javascript
import React, { createContext, useContext, useMemo, useRef, useState, useCallback } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUser } from './UserContext';

const WorkoutContext = createContext(null);

export const useWorkout = () => {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within a WorkoutProvider');
  return ctx;
};

const levelToDurationMinutes = {
  beginner: 15,
  intermediate: 30,
  advanced: 45,
};

export const WorkoutProvider = ({ children }) => {
  const { user, isAuthenticated } = useUser();

  // Session state
  const [currentExercise, setCurrentExercise] = useState(null);
  const [level, setLevel] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [reps, setReps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [poseAccuracy, setPoseAccuracy] = useState(0);
  const [feedbackMessages, setFeedbackMessages] = useState([]);
  const [repCounts, setRepCounts] = useState({
    squat: 0,
    bicepCurl: 0,
    frontKick: 0,
    overheadPress: 0,
    lateralRaise: 0,
    crunch: 0
  });
  const [feedbackCounts, setFeedbackCounts] = useState({ positive: 0, negative: 0 });
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const calorieTimerRef = useRef(null);

  const SECONDS_PER_CALORIE = {
    'squat': 8,
    'bicep-curl': 16,
    'front-kick': 7,
    'overhead-press': 15,
    'lateral-raise': 16,
    'crunch': 16.2,
  };

  // Refs for latest values
  const currentExerciseRef = useRef(currentExercise);
  const startTimeRef = useRef(startTime);
  const repCountsRef = useRef(repCounts);
  const caloriesRef = useRef(calories);
  const poseAccuracyRef = useRef(poseAccuracy);
  const levelRef = useRef(level);

  // Keep refs in sync
  React.useEffect(() => {
    currentExerciseRef.current = currentExercise;
    startTimeRef.current = startTime;
    repCountsRef.current = repCounts;
    caloriesRef.current = calories;
    poseAccuracyRef.current = poseAccuracy;
    levelRef.current = level;
  }, [currentExercise, startTime, repCounts, calories, poseAccuracy, level]);

  // Load workout history from Firestore
  React.useEffect(() => {
    if (isAuthenticated && user) {
      loadWorkoutHistory();
    } else {
      setWorkoutHistory([]);
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadWorkoutHistory = async () => {
    try {
      const workoutsRef = collection(db, 'workouts');
      const q = query(
        workoutsRef,
        where('userId', '==', user.uid),
        orderBy('workoutDate', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      
      const history = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          exercise: data.exercise,
          date: data.workoutDate.toDate ? data.workoutDate.toDate().toISOString() : data.workoutDate,
          duration: data.durationMs,
          reps: data.reps,
          calories: data.calories,
          accuracy: data.accuracy,
          level: data.level
        });
      });

      setWorkoutHistory(history);
    } catch (error) {
      console.error('Error loading workout history:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapExerciseKey = (ex) => {
    if (!ex) return 'squat';
    if (ex === 'bicep-curl') return 'bicepCurl';
    if (ex === 'front-kick') return 'frontKick';
    if (ex === 'overhead-press') return 'overheadPress';
    if (ex === 'lateral-raise') return 'lateralRaise';
    return ex;
  };

  const startSession = useCallback((exercise, selectedLevel) => {
    console.log('startSession called with:', { exercise, selectedLevel });
    const normalizedLevel = (selectedLevel || 'beginner').toLowerCase();
    const normalizedExercise = (exercise || 'squat').toLowerCase();

    if (!normalizedExercise || normalizedExercise === 'null') {
      console.error('Invalid exercise provided to startSession');
      return;
    }

    setCurrentExercise(normalizedExercise);
    setLevel(normalizedLevel);
    setDuration(levelToDurationMinutes[normalizedLevel] || 0);
    setIsActive(true);
    setStartTime(null);
    setReps(0);
    setCalories(0);
    setPoseAccuracy(0);
    setFeedbackMessages([]);
    setFeedbackCounts({ positive: 0, negative: 0 });
  }, []);

  const endSession = useCallback(async () => {
    const exercise = currentExerciseRef.current;
    const start = startTimeRef.current;
    const counts = repCountsRef.current;
    const cals = caloriesRef.current;
    const accuracy = poseAccuracyRef.current;
    const lvl = levelRef.current;

    if (exercise && start && isAuthenticated && user) {
      const durationMs = Date.now() - start;
      const workoutData = {
        userId: user.uid,
        exercise: exercise.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        workoutDate: serverTimestamp(),
        durationMs: durationMs,
        reps: counts[mapExerciseKey(exercise)] || 0,
        calories: cals,
        accuracy: accuracy,
        level: lvl,
        createdAt: serverTimestamp()
      };

      try {
        // Save to Firestore
        await addDoc(collection(db, 'workouts'), workoutData);

        // Reload history
        await loadWorkoutHistory();
      } catch (error) {
        console.error('Error saving workout:', error);
      }
    }

    setIsActive(false);
    if (calorieTimerRef.current) {
      clearInterval(calorieTimerRef.current);
      calorieTimerRef.current = null;
    }
  }, [isAuthenticated, user]);

  const startTimer = useCallback(() => {
    setStartTime(Date.now());
    if (calorieTimerRef.current) {
      clearInterval(calorieTimerRef.current);
      calorieTimerRef.current = null;
    }

    const exercise = currentExerciseRef.current;
    if (exercise && SECONDS_PER_CALORIE[exercise]) {
      const intervalSeconds = SECONDS_PER_CALORIE[exercise];
      calorieTimerRef.current = setInterval(() => {
        setCalories(prev => prev + 1);
      }, intervalSeconds * 1000);
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (calorieTimerRef.current) {
        clearInterval(calorieTimerRef.current);
        calorieTimerRef.current = null;
      }
    };
  }, []);

  const addFeedback = useCallback((message, type = 'success') => {
    const now = Date.now();

    setFeedbackMessages(prev => {
      if (prev.length > 0 && prev[0].message === message && (now - prev[0].timestamp < 1000)) {
        return prev;
      }

      const next = [{ message, type, id: `${now}-${Math.random().toString(36).slice(2)}`, timestamp: now }, ...prev];
      return next.slice(0, 3);
    });

    setFeedbackCounts(prev => {
      const isPositive = type === 'success' || type === 'info';
      const isNegative = type === 'error';

      const newCounts = {
        positive: isPositive ? prev.positive + 1 : prev.positive,
        negative: isNegative ? prev.negative + 1 : prev.negative
      };

      const totalWeighted = (newCounts.positive * 1.0) + (newCounts.negative * 0.3);
      const accuracy = totalWeighted > 0 ? Math.round((newCounts.positive * 1.0) / totalWeighted * 100) : 0;

      setPoseAccuracy(accuracy);

      return newCounts;
    });
  }, []);

  const clearFeedback = useCallback(() => setFeedbackMessages([]), []);

  const updateRepCount = useCallback((exercise, count) => {
    setRepCounts(prev => ({ ...prev, [exercise]: count }));
  }, []);

  const value = useMemo(() => ({
    currentExercise,
    level,
    duration,
    isActive,
    startTime,
    reps,
    calories,
    poseAccuracy,
    feedbackMessages,
    repCounts,
    feedbackCounts,
    workoutHistory,
    loading,
    lastWorkout: workoutHistory.length > 0 ? workoutHistory[0] : null,
    startSession,
    endSession,
    addFeedback,
    clearFeedback,
    updateRepCount,
    startTimer,
    setReps,
    setCalories,
    setPoseAccuracy,
  }), [
    currentExercise, level, duration, isActive, startTime, reps, calories,
    poseAccuracy, feedbackMessages, repCounts, feedbackCounts, workoutHistory,
    loading, startSession, endSession, addFeedback, clearFeedback,
    updateRepCount, startTimer
  ]);

  return (
    <WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>
  );
};

export default WorkoutContext;
```

---

## Data Migration Utility

Create a utility to migrate existing localStorage data to Firebase:

Create `src/utils/migrateToFirebase.js`:

```javascript
import {
  doc,
  setDoc,
  collection,
  addDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Migrate localStorage data to Firebase Firestore
 * Call this once after user logs in for the first time
 */
export const migrateLocalStorageToFirebase = async (userId) => {
  if (!userId) {
    console.error('No user ID provided for migration');
    return { success: false, error: 'No user ID' };
  }

  const results = {
    userData: null,
    goalsData: null,
    workoutHistory: null,
    errors: []
  };

  try {
    // 1. Migrate user data
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        await setDoc(doc(db, 'users', userId), {
          email: parsedUser.email,
          name: parsedUser.name || '',
          gender: parsedUser.gender || '',
          birthdate: parsedUser.birthdate || '',
          age: parsedUser.age || null,
          profilePictureUrl: parsedUser.profilePicture || null,
          hasCompletedOnboarding: parsedUser.hasCompletedOnboarding || false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        results.userData = 'success';
      } catch (error) {
        console.error('Error migrating user data:', error);
        results.errors.push({ type: 'userData', error });
      }
    }

    // 2. Migrate goals data
    const goalsData = localStorage.getItem('goalsData');
    if (goalsData) {
      try {
        const parsedGoals = JSON.parse(goalsData);

        // Migrate goals
        await setDoc(doc(db, 'goals', userId), {
          userId: userId,
          currentWeight: parsedGoals.currentWeight || null,
          goalWeight: parsedGoals.goalWeight || null,
          initialWeight: parsedGoals.initialWeight || null,
          goalType: parsedGoals.goal || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Migrate weight history using batch
        if (parsedGoals.weightHistory && parsedGoals.weightHistory.length > 0) {
          const batch = writeBatch(db);
          const historyRef = collection(db, 'weightHistory', userId, 'entries');

          parsedGoals.weightHistory.forEach((entry) => {
            const docRef = doc(historyRef);
            batch.set(docRef, {
              weight: entry.weight,
              recordedDate: entry.date,
              createdAt: serverTimestamp()
            });
          });

          await batch.commit();
        }

        results.goalsData = 'success';
      } catch (error) {
        console.error('Error migrating goals data:', error);
        results.errors.push({ type: 'goalsData', error });
      }
    }

    // 3. Migrate workout history using batch
    const workoutHistory = localStorage.getItem('workoutHistory');
    if (workoutHistory) {
      try {
        const parsedWorkouts = JSON.parse(workoutHistory);

        if (parsedWorkouts && parsedWorkouts.length > 0) {
          const batch = writeBatch(db);
          const workoutsRef = collection(db, 'workouts');

          parsedWorkouts.forEach((workout) => {
            const docRef = doc(workoutsRef);
            batch.set(docRef, {
              userId: userId,
              exercise: workout.exercise,
              workoutDate: new Date(workout.date),
              durationMs: workout.duration,
              reps: workout.reps,
              calories: workout.calories,
              accuracy: workout.accuracy,
              level: workout.level,
              createdAt: serverTimestamp()
            });
          });

          await batch.commit();
          results.workoutHistory = 'success';
        }
      } catch (error) {
        console.error('Error migrating workout history:', error);
        results.errors.push({ type: 'workoutHistory', error });
      }
    }

    // 4. Clear localStorage after successful migration
    if (results.errors.length === 0) {
      localStorage.removeItem('userData');
      localStorage.removeItem('goalsData');
      localStorage.removeItem('workoutHistory');
      console.log('Successfully migrated all data and cleared localStorage');
    }

    return {
      success: results.errors.length === 0,
      results,
      errors: results.errors
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error };
  }
};

/**
 * Check if user has already migrated
 */
export const hasUserMigrated = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists();
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

/**
 * Run migration check and migrate if needed
 */
export const autoMigrate = async (userId) => {
  const hasMigrated = await hasUserMigrated(userId);

  if (!hasMigrated) {
    console.log('Running automatic migration...');
    return await migrateLocalStorageToFirebase(userId);
  }

  return { success: true, message: 'Already migrated' };
};
```

### Usage in App

```javascript
// In your main App component or after successful login
import { useEffect } from 'react';
import { useUser } from './context/UserContext';
import { autoMigrate } from './utils/migrateToFirebase';

function App() {
  const { user, isAuthenticated } = useUser();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Auto-migrate localStorage data on first login
      autoMigrate(user.uid).then(result => {
        if (result.success) {
          console.log('Migration completed successfully');
        }
      });
    }
  }, [isAuthenticated, user]);

  // ... rest of your app
}
```

---

## Real-time Features

Firebase provides real-time listeners for live data updates:

### Example: Real-time Workout Updates

```javascript
// In WorkoutContext.jsx
import { onSnapshot } from 'firebase/firestore';

useEffect(() => {
  if (!user) return;

  // Subscribe to workout changes
  const workoutsRef = collection(db, 'workouts');
  const q = query(
    workoutsRef,
    where('userId', '==', user.uid),
    orderBy('workoutDate', 'desc'),
    limit(10)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const history = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        exercise: data.exercise,
        date: data.workoutDate.toDate().toISOString(),
        duration: data.durationMs,
        reps: data.reps,
        calories: data.calories,
        accuracy: data.accuracy,
        level: data.level
      });
    });
    setWorkoutHistory(history);
  });

  return () => unsubscribe();
}, [user]);
```

### Example: Real-time Goals Updates

```javascript
// In GoalsContext.jsx
import { onSnapshot, doc } from 'firebase/firestore';

useEffect(() => {
  if (!user) return;

  // Subscribe to goals changes
  const unsubscribe = onSnapshot(doc(db, 'goals', user.uid), (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      setCurrentWeight(data.currentWeight || null);
      setGoalWeight(data.goalWeight || null);
      setInitialWeight(data.initialWeight || null);
      setGoal(data.goalType || '');
    }
  });

  return () => unsubscribe();
}, [user]);
```

---

## File Storage Setup

### Profile Picture Upload

Create `src/utils/uploadProfilePicture.js`:

```javascript
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * Upload profile picture to Firebase Storage
 */
export const uploadProfilePicture = async (userId, file) => {
  try {
    // Validate file
    if (!file) throw new Error('No file provided');

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    // Create storage reference
    const storageRef = ref(storage, filePath);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        userId: userId,
        uploadedAt: new Date().toISOString()
      }
    });

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return { url: downloadURL, path: filePath, error: null };
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return { url: null, path: null, error };
  }
};

/**
 * Delete profile picture
 */
export const deleteProfilePicture = async (filePath) => {
  try {
    if (!filePath) throw new Error('No file path provided');

    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    return { success: false, error };
  }
};

/**
 * Compress image before upload
 */
export const compressImage = async (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if necessary
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            }));
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = reject;
    };

    reader.onerror = reject;
  });
};
```

### Usage Example

```javascript
import { uploadProfilePicture, compressImage } from '../utils/uploadProfilePicture';
import { updateUser } from '../context/UserContext';

const handleProfilePictureUpload = async (file) => {
  try {
    // Compress image before upload
    const compressedFile = await compressImage(file);

    // Upload to Firebase Storage
    const { url, path, error } = await uploadProfilePicture(user.uid, compressedFile);

    if (error) throw error;

    // Update user profile with new picture URL
    await updateUser({ profilePictureUrl: url });

    console.log('Profile picture uploaded successfully');
  } catch (error) {
    console.error('Error uploading profile picture:', error);
  }
};
```

---

## Security Rules

### Firestore Security Rules

Go to **Firestore Database** → **Rules** and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }
    
    // Goals collection
    match /goals/{userId} {
      allow read, write: if isOwner(userId);
    }
    
    // Weight history collection
    match /weightHistory/{userId}/{document=**} {
      allow read, write: if isOwner(userId);
    }
    
    // Workouts collection
    match /workouts/{workoutId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
  }
}
```

### Storage Security Rules

Go to **Storage** → **Rules** and add:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper function to check file size (5MB max)
    function isValidSize() {
      return request.resource.size < 5 * 1024 * 1024;
    }
    
    // Helper function to check if file is an image
    function isImage() {
      return request.resource.contentType.matches('image/.*');
    }
    
    // Profile pictures
    match /profiles/{fileName} {
      // Allow read if authenticated
      allow read: if request.auth != null;
      
      // Allow write if authenticated, owns the file, valid image, and valid size
      allow write: if request.auth != null 
                   && fileName.matches('^' + request.auth.uid + '-.*')
                   && isImage()
                   && isValidSize();
      
      // Allow delete if authenticated and owns the file
      allow delete: if request.auth != null
                    && fileName.matches('^' + request.auth.uid + '-.*');
    }
  }
}
```

---

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```javascript
try {
  const docRef = await addDoc(collection(db, 'workouts'), data);
  console.log('Document written with ID:', docRef.id);
} catch (error) {
  console.error('Error adding document:', error);
  // Show user-friendly error message
  alert('Failed to save workout. Please try again.');
}
```

### 2. Loading States

Show loading indicators during data fetches:

```javascript
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadData()
    .catch(console.error)
    .finally(() => setLoading(false));
}, []);

if (loading) return <div>Loading...</div>;
```

### 3. Optimistic Updates

Update UI immediately, then sync with database:

```javascript
const updateWeight = async (newWeight) => {
  const oldWeight = currentWeight;
  
  // Update UI immediately
  setCurrentWeight(newWeight);

  try {
    // Sync with database
    await setDoc(doc(db, 'goals', user.uid), {
      currentWeight: newWeight
    }, { merge: true });
  } catch (error) {
    // Revert on error
    setCurrentWeight(oldWeight);
    console.error('Error:', error);
    alert('Failed to update weight');
  }
};
```

### 4. Batch Operations

Use batch writes for multiple documents:

```javascript
import { writeBatch } from 'firebase/firestore';

const batch = writeBatch(db);

// Add multiple workouts
workouts.forEach((workout) => {
  const docRef = doc(collection(db, 'workouts'));
  batch.set(docRef, workout);
});

// Commit batch
await batch.commit();
```

### 5. Pagination

Implement pagination for large datasets:

```javascript
import { query, orderBy, limit, startAfter } from 'firebase/firestore';

const [lastVisible, setLastVisible] = useState(null);

const loadMore = async () => {
  const q = query(
    collection(db, 'workouts'),
    where('userId', '==', userId),
    orderBy('workoutDate', 'desc'),
    startAfter(lastVisible),
    limit(10)
  );
  
  const snapshot = await getDocs(q);
  setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
  
  // Process data...
};
```

### 6. Offline Support

Firebase automatically handles offline support, but you can configure it:

```javascript
import { enableIndexedDbPersistence } from 'firebase/firestore';

// Enable offline persistence
try {
  await enableIndexedDbPersistence(db);
} catch (err) {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    console.warn('Persistence failed: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // Browser doesn't support persistence
    console.warn('Persistence not supported');
  }
}
```

---

## Cost Considerations

### Firebase Free Tier (Spark Plan)

- **Firestore**:
  - 1GB storage
  - 50K reads/day
  - 20K writes/day
  - 20K deletes/day

- **Authentication**: Unlimited users

- **Storage**:
  - 5GB storage
  - 1GB/day download

- **Cloud Functions**:
  - 125K invocations/month
  - 40K GB-seconds, 40K GHz-seconds compute time/month

### Optimization Tips

1. **Minimize Reads**: Cache data in React state
   ```javascript
   // Bad: Reads on every render
   getDocs(collection(db, 'workouts'));

   // Good: Read once, cache in state
   useEffect(() => {
     getDocs(collection(db, 'workouts')).then(setWorkouts);
   }, []);
   ```

2. **Use Real-time Listeners Wisely**: Only for truly real-time data
   ```javascript
   // Expensive: Real-time listener for static data
   onSnapshot(doc(db, 'config', 'settings'), callback);

   // Better: One-time fetch for static data
   getDoc(doc(db, 'config', 'settings')).then(callback);
   ```

3. **Batch Operations**: Reduce write costs
   ```javascript
   // Multiple writes
   await setDoc(doc1, data1);
   await setDoc(doc2, data2);
   await setDoc(doc3, data3);

   // Single batch write
   const batch = writeBatch(db);
   batch.set(doc1, data1);
   batch.set(doc2, data2);
   batch.set(doc3, data3);
   await batch.commit();
   ```

4. **Compress Images**: Reduce storage and bandwidth costs
   - Use the `compressImage` utility before upload
   - Store multiple sizes (thumbnail, medium, full)

5. **Pagination**: Don't load all data at once
   - Use `limit()` to restrict query size
   - Implement "Load More" functionality

6. **Monitor Usage**:
   - Go to Firebase Console → Usage & Billing
   - Set up budget alerts
   - Monitor daily usage

---

## Testing

### Using Firebase Emulators (Local Development)

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init emulators
   ```

4. Start emulators:
   ```bash
   firebase emulators:start
   ```

5. Update your `.env`:
   ```env
   REACT_APP_USE_FIREBASE_EMULATOR=true
   ```

---

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Solution: Check Firestore/Storage security rules
   - Ensure user is authenticated before accessing data

2. **CORS Errors**
   - Solution: Configure CORS in Firebase Console (Storage → CORS Configuration)

3. **Timestamps Not Working**
   - Solution: Use `serverTimestamp()` for server-side timestamps
   - Don't use `new Date()` for timestamps in Firestore

4. **Real-time Listeners Not Updating**
   - Solution: Ensure listener is properly set up and cleaned up
   - Check that unsubscribe is called in cleanup

5. **Auth State Persistence**
   - Solution: Firebase automatically persists auth state
   - Don't manually store auth tokens in localStorage

---

## Next Steps

1. Set up staging and production Firebase projects
2. Configure environment variables for different environments
3. Set up Firebase Cloud Functions for backend logic
4. Add Firebase Analytics tracking
5. Configure Firebase Performance Monitoring
6. Set up automated backups using Cloud Functions
7. Add push notifications using Firebase Cloud Messaging

---

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase Storage](https://firebase.google.com/docs/storage)
- [Security Rules](https://firebase.google.com/docs/rules)
- [Firebase CLI](https://firebase.google.com/docs/cli)

---

**Migration Complete!** 🎉

Your app now uses Firebase for authentication, database, and storage instead of localStorage.

