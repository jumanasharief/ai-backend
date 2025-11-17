# Migration Guide: LocalStorage to Supabase

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Supabase Project Setup](#supabase-project-setup)
4. [Database Schema](#database-schema)
5. [Authentication Setup](#authentication-setup)
6. [Installing Dependencies](#installing-dependencies)
7. [Supabase Client Configuration](#supabase-client-configuration)
8. [Context Migration](#context-migration)
9. [Data Migration Utility](#data-migration-utility)
10. [Real-time Features](#real-time-features)
11. [File Storage Setup](#file-storage-setup)
12. [Best Practices](#best-practices)
13. [Cost Considerations](#cost-considerations)

---

## Overview

This guide walks you through migrating from localStorage-based data management to Supabase, a PostgreSQL-based backend-as-a-service platform. Supabase provides:

- **PostgreSQL Database**: Robust, relational database
- **Built-in Authentication**: Email/password, OAuth providers (Google, GitHub, etc.)
- **Real-time Subscriptions**: Live data updates
- **Row Level Security (RLS)**: Database-level security policies
- **Storage**: File upload/download for profile pictures
- **Auto-generated REST API**: Type-safe client libraries

---

## Prerequisites

- Node.js and npm/yarn installed
- Existing React application with localStorage contexts
- Basic understanding of SQL and React hooks

---

## Supabase Project Setup

### 1. Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Click "New Project"
4. Fill in project details:
   - **Name**: ai-coach-app
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier (up to 500MB database, 1GB file storage)

### 2. Get Your API Credentials

Once your project is created, go to **Settings** → **API**:

- **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
- **anon/public key**: `eyJhbGc...` (safe to use in frontend)
- **service_role key**: `eyJhbGc...` (keep secret, backend only)

---

## Database Schema

### 1. Create Tables

Go to **SQL Editor** in your Supabase dashboard and run these SQL commands:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  gender TEXT,
  birthdate DATE,
  age INTEGER,
  profile_picture_url TEXT,
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Goals table
CREATE TABLE public.goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_weight DECIMAL(5,2),
  goal_weight DECIMAL(5,2),
  initial_weight DECIMAL(5,2),
  goal_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id)
);

-- Weight history table
CREATE TABLE public.weight_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  recorded_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, recorded_date)
);

-- Workouts table
CREATE TABLE public.workouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise TEXT NOT NULL,
  level TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  reps INTEGER DEFAULT 0,
  calories INTEGER DEFAULT 0,
  accuracy INTEGER DEFAULT 0,
  workout_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better query performance
CREATE INDEX idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX idx_workouts_date ON public.workouts(workout_date DESC);
CREATE INDEX idx_weight_history_user_id ON public.weight_history(user_id);
CREATE INDEX idx_weight_history_date ON public.weight_history(recorded_date DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at automatically
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Goals policies
CREATE POLICY "Users can view own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);

-- Weight history policies
CREATE POLICY "Users can view own weight history" ON public.weight_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight history" ON public.weight_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight history" ON public.weight_history
  FOR DELETE USING (auth.uid() = user_id);

-- Workouts policies
CREATE POLICY "Users can view own workouts" ON public.workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts" ON public.workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts" ON public.workouts
  FOR DELETE USING (auth.uid() = user_id);
```

### 3. Create Helper Functions

```sql
-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get latest workout
CREATE OR REPLACE FUNCTION get_latest_workout(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  exercise TEXT,
  level TEXT,
  duration_ms INTEGER,
  reps INTEGER,
  calories INTEGER,
  accuracy INTEGER,
  workout_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.exercise, w.level, w.duration_ms, w.reps, w.calories, w.accuracy, w.workout_date
  FROM public.workouts w
  WHERE w.user_id = p_user_id
  ORDER BY w.workout_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Authentication Setup

### Email/Password Authentication

Supabase provides built-in authentication. Enable it in your dashboard:

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional)
4. Enable **Confirm Email** if you want email verification

### OAuth Providers (Optional)

To add Google, GitHub, or other OAuth providers:

1. Go to **Authentication** → **Providers**
2. Enable desired provider (e.g., Google)
3. Add OAuth credentials from provider's console
4. Configure redirect URLs

---

## Installing Dependencies

```bash
npm install @supabase/supabase-js

# Optional: for better TypeScript support
npm install --save-dev @supabase/supabase-js
```

---

## Supabase Client Configuration

### 1. Create Supabase Client

Create `src/lib/supabaseClient.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionUrl: true
  }
});
```

### 2. Environment Variables

Create `.env` file in your project root:

```env
# Vite (if using Vite)
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Create React App (if using CRA)
REACT_APP_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGc...
```

**Important**: Add `.env` to `.gitignore`!

---

## Context Migration

### 1. UserContext Migration

Create `src/context/UserContext.jsx`:

```javascript
import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Load user session on mount
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user profile from database
  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sign up new user
  const signUp = async (email, password, userData = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData // This will be available in raw_user_meta_data
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      return { data: null, error };
    }
  };

  // Sign in existing user
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { data: null, error };
    }
  };

  // Sign out
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setProfile(null);
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Update user profile
  const updateUser = async (userData) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...userData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return { data, error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { data: null, error };
    }
  };

  // Mark onboarding as complete
  const markOnboardingComplete = async () => {
    return await updateUser({ has_completed_onboarding: true });
  };

  const value = {
    user,
    profile,
    session,
    loading,
    isAuthenticated: !!user,
    signUp,
    signIn,
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
import { supabase } from '../lib/supabaseClient';
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

  // Load goals from database
  const loadGoalsData = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setCurrentWeight(data.current_weight);
        setGoalWeight(data.goal_weight);
        setInitialWeight(data.initial_weight);
        setGoal(data.goal_type || '');
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load weight history from database
  const loadWeightHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_date', { ascending: false })
        .limit(7);

      if (error) throw error;

      const formattedHistory = data.map(entry => ({
        date: entry.recorded_date,
        weight: parseFloat(entry.weight)
      }));

      setWeightHistory(formattedHistory);
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
      // Update goals table
      const { error: goalsError } = await supabase
        .from('goals')
        .upsert({
          user_id: user.id,
          current_weight: weightValue,
          goal_weight: goalWeight,
          initial_weight: initialWeight,
          goal_type: goal
        });

      if (goalsError) throw goalsError;

      setCurrentWeight(weightValue);

      // Add to weight history if date provided
      if (date) {
        const entryDate = date || new Date().toISOString().split('T')[0];

        const { error: historyError } = await supabase
          .from('weight_history')
          .upsert({
            user_id: user.id,
            weight: weightValue,
            recorded_date: entryDate
          }, {
            onConflict: 'user_id,recorded_date'
          });

        if (historyError) throw historyError;

        // Reload weight history
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
      const { error } = await supabase
        .from('goals')
        .upsert({
          user_id: user.id,
          goal_weight: weightValue,
          current_weight: currentWeight,
          initial_weight: initialWeight,
          goal_type: goal
        });

      if (error) throw error;

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
      const { error } = await supabase
        .from('goals')
        .upsert({
          user_id: user.id,
          initial_weight: weightValue,
          current_weight: weightValue,
          goal_weight: goalWeight,
          goal_type: goal
        });

      if (error) throw error;

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
      const { error } = await supabase
        .from('goals')
        .upsert({
          user_id: user.id,
          goal_type: goalType,
          current_weight: currentWeight,
          goal_weight: goalWeight,
          initial_weight: initialWeight
        });

      if (error) throw error;

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
      // Delete goals
      await supabase
        .from('goals')
        .delete()
        .eq('user_id', user.id);

      // Delete weight history
      await supabase
        .from('weight_history')
        .delete()
        .eq('user_id', user.id);

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
import { supabase } from '../lib/supabaseClient';
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

  // Load workout history from database
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
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('workout_date', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedHistory = data.map(workout => ({
        exercise: workout.exercise,
        date: workout.workout_date,
        duration: workout.duration_ms,
        reps: workout.reps,
        calories: workout.calories,
        accuracy: workout.accuracy,
        level: workout.level
      }));

      setWorkoutHistory(formattedHistory);
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
        user_id: user.id,
        exercise: exercise.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        workout_date: new Date().toISOString(),
        duration_ms: durationMs,
        reps: counts[mapExerciseKey(exercise)] || 0,
        calories: cals,
        accuracy: accuracy,
        level: lvl
      };

      try {
        // Save to database
        const { data, error } = await supabase
          .from('workouts')
          .insert([workoutData])
          .select()
          .single();

        if (error) throw error;

        // Update local history
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

Create a utility to migrate existing localStorage data to Supabase:

Create `src/utils/migrateToSupabase.js`:

```javascript
import { supabase } from '../lib/supabaseClient';

/**
 * Migrate localStorage data to Supabase
 * Call this once after user logs in for the first time
 */
export const migrateLocalStorageToSupabase = async (userId) => {
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
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: parsedUser.email,
            name: parsedUser.name,
            gender: parsedUser.gender,
            birthdate: parsedUser.birthdate,
            age: parsedUser.age,
            profile_picture_url: parsedUser.profilePicture,
            has_completed_onboarding: parsedUser.hasCompletedOnboarding || false
          });

        if (profileError) throw profileError;
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
        const { error: goalsError } = await supabase
          .from('goals')
          .upsert({
            user_id: userId,
            current_weight: parsedGoals.currentWeight,
            goal_weight: parsedGoals.goalWeight,
            initial_weight: parsedGoals.initialWeight,
            goal_type: parsedGoals.goal
          });

        if (goalsError) throw goalsError;

        // Migrate weight history
        if (parsedGoals.weightHistory && parsedGoals.weightHistory.length > 0) {
          const weightHistoryData = parsedGoals.weightHistory.map(entry => ({
            user_id: userId,
            weight: entry.weight,
            recorded_date: entry.date
          }));

          const { error: historyError } = await supabase
            .from('weight_history')
            .upsert(weightHistoryData);

          if (historyError) throw historyError;
        }

        results.goalsData = 'success';
      } catch (error) {
        console.error('Error migrating goals data:', error);
        results.errors.push({ type: 'goalsData', error });
      }
    }

    // 3. Migrate workout history
    const workoutHistory = localStorage.getItem('workoutHistory');
    if (workoutHistory) {
      try {
        const parsedWorkouts = JSON.parse(workoutHistory);
        
        if (parsedWorkouts && parsedWorkouts.length > 0) {
          const workoutData = parsedWorkouts.map(workout => ({
            user_id: userId,
            exercise: workout.exercise,
            workout_date: workout.date,
            duration_ms: workout.duration,
            reps: workout.reps,
            calories: workout.calories,
            accuracy: workout.accuracy,
            level: workout.level
          }));

          const { error: workoutError } = await supabase
            .from('workouts')
            .insert(workoutData);

          if (workoutError) throw workoutError;
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
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    return !error && data !== null;
  } catch (error) {
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
    return await migrateLocalStorageToSupabase(userId);
  }
  
  return { success: true, message: 'Already migrated' };
};
```

### Usage in App

```javascript
// In your main App component or after successful login
import { useEffect } from 'react';
import { useUser } from './context/UserContext';
import { autoMigrate } from './utils/migrateToSupabase';

function App() {
  const { user, isAuthenticated } = useUser();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Auto-migrate localStorage data on first login
      autoMigrate(user.id).then(result => {
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

Supabase provides real-time subscriptions for live data updates:

### Example: Real-time Workout Updates

```javascript
// In WorkoutContext.jsx
useEffect(() => {
  if (!user) return;

  // Subscribe to workout changes
  const subscription = supabase
    .channel('workout_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'workouts',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('New workout added:', payload.new);
        loadWorkoutHistory(); // Reload history
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [user]);
```

### Example: Real-time Weight Updates

```javascript
// In GoalsContext.jsx
useEffect(() => {
  if (!user) return;

  const subscription = supabase
    .channel('goals_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // All events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'goals',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('Goals updated:', payload);
        loadGoalsData();
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [user]);
```

---

## File Storage Setup

### Profile Picture Upload

Create `src/utils/uploadProfilePicture.js`:

```javascript
import { supabase } from '../lib/supabaseClient';

/**
 * Upload profile picture to Supabase Storage
 */
export const uploadProfilePicture = async (userId, file) => {
  try {
    // Validate file
    if (!file) throw new Error('No file provided');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return { url: null, error };
  }
};

/**
 * Delete profile picture
 */
export const deleteProfilePicture = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath]);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    return { success: false, error };
  }
};
```

### Configure Storage Bucket

1. Go to **Storage** in Supabase dashboard
2. Create a new bucket called `avatars`
3. Set it to **Public** (or configure RLS policies)
4. Add file size limit (e.g., 5MB)

### Storage RLS Policies (if using private bucket)

```sql
-- Allow users to upload their own profile pictures
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'profiles' AND
    auth.uid()::text = (regexp_match(name, '^profiles/([^-]+)-'))[1]
  );

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'profiles' AND
    auth.uid()::text = (regexp_match(name, '^profiles/([^-]+)-'))[1]
  );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'profiles' AND
    auth.uid()::text = (regexp_match(name, '^profiles/([^-]+)-'))[1]
  );

-- Allow anyone to view avatars (if public profiles)
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

---

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```javascript
try {
  const { data, error } = await supabase
    .from('table')
    .select('*');
    
  if (error) throw error;
  
  // Handle data
} catch (error) {
  console.error('Error:', error);
  // Show user-friendly error message
  // Optionally fall back to localStorage
}
```

### 2. Loading States

Show loading indicators during data fetches:

```javascript
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadData().finally(() => setLoading(false));
}, []);

if (loading) return <div>Loading...</div>;
```

### 3. Optimistic Updates

Update UI immediately, then sync with database:

```javascript
const updateWeight = async (newWeight) => {
  // Update UI immediately
  setCurrentWeight(newWeight);
  
  try {
    // Sync with database
    await supabase.from('goals').update({ current_weight: newWeight });
  } catch (error) {
    // Revert on error
    setCurrentWeight(oldWeight);
    console.error('Error:', error);
  }
};
```

### 4. Batch Operations

Use batch inserts for multiple records:

```javascript
const { data, error } = await supabase
  .from('weight_history')
  .insert([
    { user_id: userId, weight: 70, recorded_date: '2024-01-01' },
    { user_id: userId, weight: 69, recorded_date: '2024-01-02' },
    { user_id: userId, weight: 68, recorded_date: '2024-01-03' }
  ]);
```

### 5. Connection Handling

Handle offline scenarios:

```javascript
window.addEventListener('online', () => {
  console.log('Back online, syncing data...');
  syncData();
});

window.addEventListener('offline', () => {
  console.log('Offline, queuing changes...');
  // Queue changes to sync later
});
```

### 6. Type Safety (TypeScript)

Generate types from your database:

```bash
npx supabase gen types typescript --project-id "xxxxx" > src/types/database.types.ts
```

---

## Cost Considerations

### Supabase Free Tier Limits

- **Database**: 500MB storage
- **Storage**: 1GB files
- **Bandwidth**: 5GB/month
- **API Requests**: Unlimited (with reasonable use)
- **Real-time Connections**: Unlimited

### Optimization Tips

1. **Pagination**: Use `.range()` for large datasets
   ```javascript
   const { data } = await supabase
     .from('workouts')
     .select('*')
     .range(0, 9); // First 10 records
   ```

2. **Select Specific Columns**: Don't fetch unnecessary data
   ```javascript
   const { data } = await supabase
     .from('profiles')
     .select('name, email') // Only fetch needed columns
     .eq('id', userId);
   ```

3. **Use Indexes**: Add indexes to frequently queried columns (already included in schema)

4. **Compress Images**: Before uploading to storage
   ```javascript
   // Use a library like 'browser-image-compression'
   import imageCompression from 'browser-image-compression';
   
   const compressedFile = await imageCompression(file, {
     maxSizeMB: 1,
     maxWidthOrHeight: 800
   });
   ```

5. **Cache Data**: Use React Query or SWR for client-side caching
   ```bash
   npm install @tanstack/react-query
   ```

---

## Testing

### Test Database Connection

```javascript
// Test connection in console or a test component
import { supabase } from './lib/supabaseClient';

const testConnection = async () => {
  const { data, error } = await supabase.from('profiles').select('count');
  console.log('Connection test:', data, error);
};
```

### Test Authentication

```javascript
const testAuth = async () => {
  // Sign up
  const { data, error } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'password123'
  });
  
  console.log('Auth test:', data, error);
};
```

---

## Troubleshooting

### Common Issues

1. **RLS Policies Too Restrictive**
   - Solution: Check policies in Supabase dashboard → Authentication → Policies

2. **CORS Errors**
   - Solution: Add your domain to allowed origins in Supabase settings

3. **Session Not Persisting**
   - Solution: Ensure `persistSession: true` in client config

4. **Email Confirmation Required**
   - Solution: Disable in Settings → Authentication → Email Auth → Disable email confirmations (for development)

---

## Next Steps

1. Set up staging and production Supabase projects
2. Configure environment variables for different environments
3. Set up database backups
4. Configure email templates for auth
5. Add monitoring and analytics
6. Implement rate limiting if needed

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Documentation](https://supabase.com/docs/guides/storage)
- [Real-time Documentation](https://supabase.com/docs/guides/realtime)

---

**Migration Complete!** 🎉

Your app now uses Supabase for authentication, database, and storage instead of localStorage.

