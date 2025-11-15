# Technical Guide: AI Coach Frontend

This document explains the technical architecture, algorithms, and implementation details of the AI Coach application.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Why Context API?](#why-context-api)
3. [Workout Session Flow](#workout-session-flow)
4. [Exercise Detection System](#exercise-detection-system)
5. [Feedback System](#feedback-system)
6. [Performance Optimizations](#performance-optimizations)

---

## Architecture Overview

### Component Hierarchy

```
<App>
  └── <UserProvider>        # User authentication & profile
      └── <GoalsProvider>   # Fitness goals & weight tracking
          └── <WorkoutProvider>  # Active workout state
              └── <Router>
                  └── <Routes>
                      └── [Page Components]
```

### Data Flow
- **Top-down:** Context providers pass state and methods to child components via `useContext()`
- **Bottom-up:** Child components call context methods (e.g., `addFeedback()`, `updateRepCount()`) to update global state
- **Persistence:** Context providers sync critical state to `localStorage` via `useEffect()` hooks

---

## Why Context API?

### Problem
Multiple pages need access to shared state:
- User profile (name, age, email) → displayed in navbar, profile page, settings
- Goals (current weight, target weight) → displayed in dashboard, updated in workout summary
- Workout data (reps, calories, feedback) → updated by pose detector, displayed in stats panel

### Solution: React Context API
Instead of **prop drilling** (passing data through 5+ components), we use **context** to make state globally accessible.

### Three Context Modules

#### 1. **UserContext** (`src/context/UserContext.jsx`)
- **Purpose:** Manages user authentication and profile
- **State:**
  - `user`: `{ name, email, age, gender, profilePicture, isAuthenticated }`
- **Methods:**
  - `updateUser(data)`: Update profile fields
  - `logout()`: Clear user data and localStorage
  - `markOnboardingComplete()`: Flag first-time setup as done
- **Persistence:** Saves to `localStorage['userData']` on every state change

#### 2. **GoalsContext** (`src/context/GoalsContext.jsx`)
- **Purpose:** Tracks fitness goals and weight progress
- **State:**
  - `currentWeight`, `goalWeight`, `initialWeight`: Numbers in kg
  - `weightHistory`: Array of `{ date, weight }` objects (last 7 entries)
  - `goal`: String ('lose', 'gain', 'maintain')
  - `progress`: Calculated percentage (0-100)
- **Methods:**
  - `updateCurrentWeight(weight, date)`: Logs new weight measurement
  - `updateGoalWeight(weight)`: Changes target weight
  - `calculateProgress()`: Computes % completion using formula:
    - **Weight Loss:** `(initialWeight - currentWeight) / (initialWeight - goalWeight) * 100`
    - **Weight Gain:** `(currentWeight - initialWeight) / (goalWeight - initialWeight) * 100`
- **Persistence:** Saves to `localStorage['goalsData']`

#### 3. **WorkoutContext** (`src/context/WorkoutContext.jsx`)
- **Purpose:** Manages active workout session state
- **State:**
  - `currentExercise`: String (e.g., 'squat', 'bicep-curl')
  - `level`: String ('beginner', 'intermediate', 'advanced')
  - `duration`: Number (minutes per level: 15, 30, 45)
  - `isActive`: Boolean (workout in progress)
  - `reps`, `calories`: Numbers (updated live during session)
  - `poseAccuracy`: Number (0-100, calculated from feedback ratio)
  - `feedbackMessages`: Array of `{ message, type, id, timestamp }`
  - `repCounts`: Object mapping exercise names to rep counts
- **Methods:**
  - `startSession(exercise, level)`: Initialize new workout
  - `endSession()`: Stop workout and clear timers
  - `addFeedback(message, type)`: Add new feedback message (throttled by type)
  - `updateRepCount(exercise, count)`: Sync rep count from detector
  - `startTimer()`: Begin calorie burn timer (burns 1 cal every N seconds per exercise)
- **Calorie Formula:** Each exercise has a `SECONDS_PER_CALORIE` constant:
  - Squat: 8s/cal, Bicep Curl: 16s/cal, Front Kick: 7s/cal, etc.
- **No Persistence:** Workout state is ephemeral (resets on page refresh)

---

## Workout Session Flow

### 1. Session Initialization
**File:** `src/pages/WorkoutsPage/WorkoutSession/WorkoutSessionWrapper.jsx`

```javascript
useEffect(() => {
  startSession(exercise, level); // From WorkoutContext
}, []);
```

- User navigates from `ExerciseMenu.jsx` with `{ state: { exercise, level } }`
- `WorkoutSessionWrapper` extracts state and calls `startSession()`
- Context resets: `reps = 0`, `calories = 0`, `feedbackMessages = []`

### 2. Camera & AI Initialization
**File:** `src/pages/WorkoutsPage/WorkoutSession/PoseCamera.jsx`

#### Steps:
1. **Request camera access:**
   ```javascript
   const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
   videoRef.current.srcObject = stream;
   ```

2. **Load MediaPipe model:**
   ```javascript
   const module = await import('https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0');
   const vision = await FilesetResolver.forVisionTasks('...');
   const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
     modelAssetPath: 'pose_landmarker_full.task',
     runningMode: 'VIDEO',
     numPoses: 1,
     minPoseDetectionConfidence: 0.5
   });
   ```

3. **10-second countdown:**
   - Shows large countdown number overlay
   - Calls `startTimer()` (begins calorie burn) when countdown hits 0
   - Plays "starting.mp3" sound

4. **Start detection loop:**
   ```javascript
   const detectPose = async () => {
     const results = await poseLandmarker.detectForVideo(video, performance.now());
     if (results.landmarks) {
       checkPosture(results.landmarks[0]);
     }
     requestAnimationFrame(detectPose); // ~30 FPS
   };
   ```

### 3. Pose Detection Pipeline
**Flow:** `PoseCamera.jsx` → `ExerciseDetector.js` → `WorkoutContext`

#### Per Frame (every ~33ms):
1. **Get landmarks:** 33 body points (x, y, z, visibility) from MediaPipe
2. **Smooth landmarks:** Apply exponential moving average to reduce jitter
   ```javascript
   smoothed = alpha * previous + (1 - alpha) * current
   ```
3. **Route to exercise detector:**
   ```javascript
   detectorRef.current.detectSquat(landmarks); // Or detectBicepCurl, detectFrontKick, etc.
   ```
4. **Update context:**
   ```javascript
   updateRepCount('squat', detectorRef.current.getRepCount('squat'));
   ```

---

## Exercise Detection System

### Core File: `src/utils/ExerciseDetector.js`

#### Architecture
- **Class-based:** Single `ExerciseDetector` instance persists across frames
- **State machine:** Each exercise tracks rep state (e.g., 'standing' → 'reached_depth' → 'standing')
- **Stability filtering:** Requires N consecutive frames in same state before triggering events

### Angle Calculation
All exercises use the same core geometry function:

```javascript
calculateAngle(a, b, c) {
  // Returns angle at point B formed by lines A-B and B-C
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle; // 0-180 degrees
}
```

### Example: Squat Detection

#### Key Angles:
1. **Knee Angle:** `calculateAngle(hip, knee, ankle)`
   - 160°+ = standing
   - 100-115° = deep squat
2. **Torso Angle:** `calculateAngle(shoulder, hip, vertical)`
   - Detects forward lean
3. **Hip Angle:** `calculateAngle(shoulder, hip, knee)`
   - Validates hip hinge

#### Rep Counting State Machine:
```javascript
// State: 'standing' | 'reached_depth'
if (repState === 'standing') {
  if (kneeAngle < 115) { // Reached depth
    repState = 'reached_depth';
  }
} else if (repState === 'reached_depth') {
  if (kneeAngle > 150) { // Returned to standing
    count++;
    addFeedback(`Rep ${count} complete! 🏋️`, 'success');
    repState = 'standing';
  }
}
```

#### Form Corrections:
```javascript
// Check chest position
const shoulderHipX = Math.abs(shoulder.x - hip.x);
if (shoulderHipX > 0.2 && kneeAngle < 115) {
  addFeedback('Keep chest up! 📐', 'error');
  sound.play('squat.form', 'squat', { formError: true });
}
```

### Stability System
**Problem:** Pose detection can flicker between states
**Solution:** Require N consecutive frames before state change

```javascript
updateStability(exercise, newStage) {
  if (state.stage !== newStage) {
    state.stage = newStage;
    state.stableFrames = 1;
    return false; // Not stable yet
  } else {
    state.stableFrames++;
    return state.stableFrames >= STABLE_FRAMES; // Typically 3 frames
  }
}
```

### Exercise-Specific Rules

#### Bicep Curl
- **Elbow Angle:** 160°+ extended, <75° contracted
- **Torso-Upper Arm Angle:** Must stay <45° (elbow pinned to side)
- **Form Error:** Shoulder-elbow horizontal drift >0.15 → "Keep elbow stable!"

#### Front Kick
- **Leg Angle:** <60° ready, >110° extended
- **Hip Angle:** <80° chambered, 35-150° extended
- **Faster Stability:** Only 1-2 frames required (ballistic movement)

#### Crunch
- **Torso Angle to Floor:** 0° flat, 5-30° crunching
- **Neck Alignment:** Head-shoulder-hip angle must be ≥165° (straight neck)
- **Range Validation:** Too shallow (<10°) or too high (>30°) triggers corrections

---

## Feedback System

### Text Feedback
**File:** `src/context/WorkoutContext.jsx` & `src/pages/WorkoutsPage/WorkoutSession/FeedbackPanel.jsx`

#### Message Types:
- `'success'` (green): Rep completions
- `'info'` (blue): Encouragement ("Keep going!")
- `'error'` (red): Form corrections

#### Throttling:
```javascript
const cooldowns = { 
  rep: 0,       // No throttle (count every rep)
  form: 2000,   // Max 1 form cue per 2 seconds
  encourage: 800 // Max 1 encouragement per 0.8 seconds
};

if (Date.now() - lastFeedback[type] >= cooldowns[type]) {
  addFeedback(message, type);
  lastFeedback[type] = Date.now();
}
```

#### Display:
```javascript
// FeedbackPanel shows last 3 messages
feedbackMessages.slice(0, 3).map(msg => (
  <div className={`feedback-item ${msg.type}`}>{msg.message}</div>
))
```

### Sound Feedback
**File:** `src/utils/SoundFeedback.js`

#### Audio Queue System
**Problem:** Multiple sounds played simultaneously cause audio collision
**Solution:** Serial queue with promise-based playback

```javascript
play(soundKey, exercise, { oncePerRep, oncePerExercise, formError }) {
  const audio = this.sounds[soundKey]; // Preloaded Audio objects
  
  // Deduplication logic
  if (oncePerRep && repSet.has(soundKey)) return; // Already played this rep
  if (formError && activeErrors.has(soundKey)) return; // Error still active
  
  // Add to queue
  this.audioQueue.push({ audio, resolve });
  this._drainQueue(); // Process serially
}

_drainQueue() {
  if (this.isPlaying) return;
  const next = this.audioQueue.shift();
  if (!next) return;
  
  this.isPlaying = true;
  next.audio.play();
  next.audio.addEventListener('ended', () => {
    this.isPlaying = false;
    this._drainQueue(); // Play next
  });
}
```

#### Sound Categories:
1. **Global Cues:**
   - `starting.mp3`: Played once at session start
   - `encourage.mp3`: Played every 5 reps
   - `midway.mp3`: Played if user dwells at midpoint >4 seconds

2. **Form Corrections (per exercise):**
   - `squat.form.mp3`: "Keep chest up"
   - `bicep-curl.form.mp3`: "Stabilize elbow"
   - `crunch.form1.mp3`: "Relax your neck"
   - `crunch.form2.mp3`: "Keep lower back down"

#### Deduplication Strategies:
- **Once per rep:** Midway sounds (reset when rep completes)
- **Once per exercise:** Session-level cues
- **Form error suppression:** Don't repeat while error persists

```javascript
clearFormError(soundKey, exercise) {
  this.activeFormErrors.get(exercise).delete(soundKey);
  // Can play again if error recurs
}
```

#### Preloading:
```javascript
preload() {
  const make = (path) => {
    const url = new URL(`../sounds/${path}`, import.meta.url);
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.load(); // Prime metadata
    return audio;
  };
  return {
    'starting': make('starting.mp3'),
    'squat.form': make('squat.form.mp3'),
    // ... etc
  };
}
```

---

## Performance Optimizations

### 1. Landmark Smoothing
**File:** `src/utils/LandmarkSmoother.js`

- Applies exponential moving average to all 33 landmarks
- Reduces jitter without lag (alpha = 0.3)
- Reset on pose loss to avoid stale data

### 2. Angle Smoothing
- Additional smoothing in `ExerciseDetector` after geometry calculations
- Lower alpha (0.4) since landmarks already smoothed

### 3. MediaPipe Configuration
```javascript
{
  runningMode: 'VIDEO',        // Optimized for video streams
  numPoses: 1,                 // Single user tracking
  minTrackingConfidence: 0.7,  // Smooth tracking vs re-detection
  delegate: 'GPU'              // Hardware acceleration (fallback to CPU)
}
```

### 4. Canvas Rendering
- Draw video frame first (always visible)
- Overlay skeleton only when landmarks detected
- Use `requestAnimationFrame` for 60 FPS sync

### 5. Context Optimization
- `useMemo` for context values to prevent re-renders
- `useCallback` for stable function references
- Selective state updates (don't re-render entire app on rep count change)

### 6. Calorie Timer
- Single `setInterval` per session (cleared on unmount)
- Exercise-specific burn rates (faster intervals for high-intensity exercises)

---

## Key Design Decisions

### Why Not Redux?
- Context API sufficient for moderate state complexity
- Avoids external dependency
- Simpler mental model for small team

### Why LocalStorage?
- No backend required (pure frontend)
- Instant persistence (no network delay)
- Privacy-friendly (data never leaves browser)

### Why Class-Based Detector?
- Maintains stateful rep counters across frames
- Single instance avoids re-initialization overhead
- Cleaner separation from React components

### Why Serial Audio Queue?
- Prevents audio overlap (jarring UX)
- Ensures form corrections take priority over encouragement
- Simpler than Web Audio API graph scheduling

---

## Future Enhancements

### Technical Debt
- Replace LocalStorage with IndexedDB for larger datasets (workout history)
- Add WebWorker for pose detection (offload from main thread)
- Implement backend API for cross-device sync

### New Features
- Multi-user pose detection (workout with friends)
- Video recording with skeleton overlay
- Progressive Web App (offline support)
- Custom exercise creation (user-defined angle thresholds)

---

**End of Technical Guide**

