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