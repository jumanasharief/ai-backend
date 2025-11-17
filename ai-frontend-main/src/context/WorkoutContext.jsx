import React, { createContext, useContext, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useUser } from './UserContext';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  
  // track selected exercise, level, and planned duration
  const [currentExercise, setCurrentExercise] = useState(null);
  const [level, setLevel] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  // track live workout metrics
  const [reps, setReps] = useState(0);
  const [calories, setCalories] = useState(0);
  // keep timer reference for calories
  const calorieTimerRef = useRef(null);
  // map seconds per calorie for each exercise
  const SECONDS_PER_CALORIE = {
    'squat': 8,
    'bicep-curl': 16,
    'front-kick': 7,
    'overhead-press': 15,
    'lateral-raise': 16,
    'crunch': 16.2,
  };

  const [poseAccuracy, setPoseAccuracy] = useState(0);
  const [feedbackMessages, setFeedbackMessages] = useState([]);
  const [repCounts, setRepCounts] = useState({ squat: 0, bicepCurl: 0, frontKick: 0, overheadPress: 0, lateralRaise: 0, crunch: 0 });
  const [feedbackCounts, setFeedbackCounts] = useState({ positive: 0, negative: 0 });

  // Initialize workout history from localStorage (fallback)
  const [workoutHistory, setWorkoutHistory] = useState(() => {
    const savedHistory = localStorage.getItem('workoutHistory');
    if (savedHistory) {
      try {
        return JSON.parse(savedHistory);
      } catch (error) {
        console.error('Error parsing saved workout history:', error);
        return [];
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(true);

  // Load workout history from Firestore when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const uid = user.uid;

    // Listen to workout history from Firestore
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'workouts'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
      (snapshot) => {
        const history = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            exercise: data.exercise || 'Unknown',
            date: data.workoutDate?.toDate()?.toISOString() || data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
            duration: data.durationMs || 0,
            reps: data.reps || 0,
            calories: data.calories || 0,
            accuracy: data.accuracy || 0,
            level: data.level || 'beginner'
          };
        });
        setWorkoutHistory(history);
        
        // Also save to localStorage as backup
        localStorage.setItem('workoutHistory', JSON.stringify(history));
        setLoading(false);
      },
      (error) => {
        console.error('Error loading workout history:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user?.uid]);

  // Reset workout history when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('=== USER LOGGED OUT - RESETTING WORKOUT HISTORY ===');
      setWorkoutHistory([]);
      localStorage.removeItem('workoutHistory');
    }
  }, [isAuthenticated]);

  // track last feedback time
  const lastFeedbackAtRef = useRef(0);

  // Use refs to store latest values without triggering recreations
  const currentExerciseRef = useRef(currentExercise);
  const startTimeRef = useRef(startTime);
  const repCountsRef = useRef(repCounts);
  const caloriesRef = useRef(calories);
  const poseAccuracyRef = useRef(poseAccuracy);
  const levelRef = useRef(level);
  const userRef = useRef(user);

  // Keep refs in sync with state
  React.useEffect(() => {
    currentExerciseRef.current = currentExercise;
    startTimeRef.current = startTime;
    repCountsRef.current = repCounts;
    caloriesRef.current = calories;
    poseAccuracyRef.current = poseAccuracy;
    levelRef.current = level;
    userRef.current = user;
  }, [currentExercise, startTime, repCounts, calories, poseAccuracy, level, user]);

  // Helper function to map exercise name to repCounts key
  const mapExerciseKey = (ex) => {
    if (!ex) return 'squat';
    if (ex === 'bicep-curl') return 'bicepCurl';
    if (ex === 'front-kick') return 'frontKick';
    if (ex === 'overhead-press') return 'overheadPress';
    if (ex === 'lateral-raise') return 'lateralRaise';
    return ex; // 'squat' and 'crunch' stay as is
  };

  const startSession = useCallback((exercise, selectedLevel) => {
    console.log('startSession called with:', { exercise, selectedLevel });
    const normalizedLevel = (selectedLevel || 'beginner').toLowerCase();
    const normalizedExercise = (exercise || 'squat').toLowerCase();
    console.log('Normalized values:', { normalizedExercise, normalizedLevel });
    
    if (!normalizedExercise || normalizedExercise === 'null') {
      console.error('Invalid exercise provided to startSession');
      return;
    }
    
    console.log('Setting currentExercise to:', normalizedExercise);
    setCurrentExercise(normalizedExercise);
    setLevel(normalizedLevel);
    setDuration(levelToDurationMinutes[normalizedLevel] || 0);
    setIsActive(true);
    // set start time after countdown
    setStartTime(null);
    setReps(0);
    setCalories(0);
    setPoseAccuracy(0);
    setFeedbackMessages([]);
    setFeedbackCounts({ positive: 0, negative: 0 });
  }, []);

  const endSession = useCallback(async () => {
    // Save workout data to history before clearing session
    // Use refs to get latest values without causing recreations
    const exercise = currentExerciseRef.current;
    const start = startTimeRef.current;
    const counts = repCountsRef.current;
    const cals = caloriesRef.current;
    const accuracy = poseAccuracyRef.current;
    const lvl = levelRef.current;
    const currentUser = userRef.current;

    if (exercise && start && currentUser?.isAuthenticated && currentUser?.uid) {
      const durationMs = Date.now() - start;
      const workoutData = {
        exercise: exercise.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        date: new Date().toISOString(),
        duration: durationMs,
        reps: counts[mapExerciseKey(exercise)] || 0,
        calories: cals,
        accuracy: accuracy,
        level: lvl
      };

      // Update local state immediately
      setWorkoutHistory(prev => {
        const newHistory = [workoutData, ...prev].slice(0, 10); // Keep last 10 workouts
        // Save to localStorage as backup
          localStorage.setItem('workoutHistory', JSON.stringify(newHistory));
        return newHistory;
      });

      // Save to Firestore
      try {
        await addDoc(collection(db, 'workouts'), {
          userId: currentUser.uid,
          exercise: workoutData.exercise,
          workoutDate: serverTimestamp(),
          durationMs: workoutData.duration,
          reps: workoutData.reps,
          calories: workoutData.calories,
          accuracy: workoutData.accuracy,
          level: workoutData.level,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error saving workout to Firestore:', error);
        // Workout is already saved to localStorage, so we continue
      }
    } else if (exercise && start) {
      // Save to localStorage only if not authenticated
      const workoutData = {
        exercise: exercise.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        date: new Date().toISOString(),
        duration: Date.now() - start,
        reps: counts[mapExerciseKey(exercise)] || 0,
        calories: cals,
        accuracy: accuracy,
        level: lvl
      };
      setWorkoutHistory(prev => {
        const newHistory = [workoutData, ...prev].slice(0, 10);
        localStorage.setItem('workoutHistory', JSON.stringify(newHistory));
        return newHistory;
      });
    }

    setIsActive(false);
    // clear calorie interval when session ends
    if (calorieTimerRef.current) {
      clearInterval(calorieTimerRef.current);
      calorieTimerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    setStartTime(Date.now());
    // clear any existing calorie timer before starting
    if (calorieTimerRef.current) {
      clearInterval(calorieTimerRef.current);
      calorieTimerRef.current = null;
    }
    // start calorie counter based on current exercise (use ref)
    const exercise = currentExerciseRef.current;
    if (exercise && SECONDS_PER_CALORIE[exercise]) {
      const intervalSeconds = SECONDS_PER_CALORIE[exercise];
      calorieTimerRef.current = setInterval(() => {
        setCalories(prev => prev + 1);
      }, intervalSeconds * 1000);
    }
  }, []);

  // clear timers on unmount
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
      // Check if this exact message was just added (prevent duplicates only)
      if (prev.length > 0 && prev[0].message === message && (now - prev[0].timestamp < 1000)) {
        return prev;
      }
      
      const next = [{ message, type, id: `${now}-${Math.random().toString(36).slice(2)}`, timestamp: now }, ...prev];
      return next.slice(0, 3);
    });

    // Update feedback counts and calculate accuracy
    setFeedbackCounts(prev => {
      const isPositive = type === 'success' || type === 'info';
      const isNegative = type === 'error';
      
      const newCounts = {
        positive: isPositive ? prev.positive + 1 : prev.positive,
        negative: isNegative ? prev.negative + 1 : prev.negative
      };
      
      // Calculate weighted accuracy: positive weight 1.0, negative weight 0.3
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
    // expose state
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
    lastWorkout: workoutHistory.length > 0 ? workoutHistory[0] : null,
    loading,

    // expose actions
    startSession,
    endSession,
    addFeedback,
    clearFeedback,
    updateRepCount,
    startTimer,

    // expose setters
    setReps,
    setCalories,
    setPoseAccuracy,
  }), [currentExercise, level, duration, isActive, startTime, reps, calories, poseAccuracy, feedbackMessages, repCounts, feedbackCounts, workoutHistory, loading, startSession, endSession, addFeedback, clearFeedback, updateRepCount, startTimer]);

  return (
    <WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>
  );
};

export default WorkoutContext;
