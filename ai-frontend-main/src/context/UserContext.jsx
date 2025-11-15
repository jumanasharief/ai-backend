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