import { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : null;
          
          // Merge Firebase Auth user with Firestore data
          const mergedUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: userData?.name || firebaseUser.displayName || '',
            gender: userData?.gender || '',
            birthdate: userData?.birthdate || '',
            age: userData?.age || null,
            profilePicture: userData?.profilePicture || userData?.profilePictureUrl || null,
            hasCompletedOnboarding: userData?.hasCompletedOnboarding || false,
            isAuthenticated: true,
            ...userData
          };
          
          setUser(mergedUser);
          setIsAuthenticated(true);
          
          // Sync to localStorage as backup
          localStorage.setItem('userData', JSON.stringify(mergedUser));
        } catch (error) {
          console.error('Error loading user data:', error);
          // Fallback to basic user data
          const basicUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || '',
            isAuthenticated: true
          };
          setUser(basicUser);
          setIsAuthenticated(true);
          localStorage.setItem('userData', JSON.stringify(basicUser));
        }
      } else {
        // User is signed out - try to load from localStorage first
        const savedUser = localStorage.getItem('userData');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser.isAuthenticated) {
              setUser(parsedUser);
              setIsAuthenticated(true);
            } else {
              setUser(null);
              setIsAuthenticated(false);
              localStorage.removeItem('userData');
            }
          } catch (error) {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('userData');
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign up function
  const signUp = async (email, password) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: '',
        hasCompletedOnboarding: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      return { user: firebaseUser, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { user: null, error };
    }
  };

  // Sign in function
  const signIn = async (email, password) => {
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      return { user: firebaseUser, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { user: null, error };
    }
  };

  // Function to update user data (used in ProfileSetup and EditProfile)
  const updateUser = async (userData) => {
    // If Firebase user exists, update Firestore
    if (auth.currentUser) {
      try {
        const uid = auth.currentUser.uid;
        
        // Update Firestore
        await setDoc(doc(db, 'users', uid), {
          ...userData,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Update local state
        setUser(prevUser => ({
          ...prevUser,
          ...userData,
          isAuthenticated: true
        }));

        // Sync to localStorage
        const updatedUser = { ...user, ...userData, isAuthenticated: true };
        localStorage.setItem('userData', JSON.stringify(updatedUser));
      } catch (error) {
        console.error('Error updating user:', error);
        // Fallback to local state update only
        setUser(prevUser => ({
          ...prevUser,
          ...userData,
          isAuthenticated: true
        }));
        const updatedUser = { ...user, ...userData, isAuthenticated: true };
        localStorage.setItem('userData', JSON.stringify(updatedUser));
      }
    } else {
      // No Firebase user, just update local state (for backward compatibility)
      setUser(prevUser => ({
        ...prevUser,
        ...userData,
        isAuthenticated: true
      }));
      localStorage.setItem('userData', JSON.stringify({ ...user, ...userData, isAuthenticated: true }));
    }
  };

  // Function to mark onboarding as complete
  const markOnboardingComplete = async () => {
    if (auth.currentUser) {
      try {
        const uid = auth.currentUser.uid;
        await setDoc(doc(db, 'users', uid), {
          hasCompletedOnboarding: true,
          updatedAt: serverTimestamp()
        }, { merge: true });

        setUser(prevUser => ({
          ...prevUser,
          hasCompletedOnboarding: true
        }));

        // Sync to localStorage
        const updatedUser = { ...user, hasCompletedOnboarding: true };
        localStorage.setItem('userData', JSON.stringify(updatedUser));
      } catch (error) {
        console.error('Error marking onboarding complete:', error);
        // Fallback to local state only
        setUser(prevUser => ({
          ...prevUser,
          hasCompletedOnboarding: true
        }));
        localStorage.setItem('userData', JSON.stringify({ ...user, hasCompletedOnboarding: true }));
      }
    } else {
      // No Firebase user, just update local state
      setUser(prevUser => ({
        ...prevUser,
        hasCompletedOnboarding: true
      }));
      localStorage.setItem('userData', JSON.stringify({ ...user, hasCompletedOnboarding: true }));
    }
  };

  // Function to logout (clear data)
  const logout = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('userData');
      localStorage.removeItem('goalsData');
      localStorage.removeItem('workoutHistory');
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      updateUser, 
      logout, 
      markOnboardingComplete,
      signUp,
      signIn,
      loading,
      isAuthenticated
    }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for easy access
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

export default UserContext;
