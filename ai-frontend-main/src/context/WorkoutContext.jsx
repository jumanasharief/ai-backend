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