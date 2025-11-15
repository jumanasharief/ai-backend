# AI Coach Frontend

An AI-powered fitness coach that tracks your exercise form in real-time using your camera. Get instant feedback on your squats, bicep curls, kicks, and more!

## What Does This App Do?

This app watches you exercise through your camera and gives you live feedback on your form. It counts your reps, burns calories, and tells you if you need to fix your posture - just like having a personal trainer!

## Technologies Used

### Core Technologies
- **React** (v19.1.1) - The main framework that builds the user interface
- **React Router** (v7.9.3) - Handles navigation between different pages
- **Vite** (v7.1.7) - Fast build tool that bundles and serves the app

### AI & Computer Vision
- **MediaPipe Pose Landmarker** - Google's AI model that detects body positions from camera feed
- **Canvas API** - Draws skeleton overlay on video to show detected body points

### Data Storage
- **LocalStorage** - Saves user profile, goals, and workout history in your browser

### Audio
- **Browser Audio API** - Plays sound files using JavaScript's built-in `Audio()` constructor
- Sound files are stored locally in the `sounds/` folder (MP3 format)

## Project Structure

```
src/
│
├── main.jsx                  # Entry point, mounts <App /> into DOM
├── index.css                 # Global styles: fonts, resets, default margins
├── App.jsx                   # Main component: defines routes and wraps pages in Layout
├── App.css                   # App-level styles
│
├── components/
│   └── navbar.jsx            # Navigation bar shown on all pages
│
├── context/
│   ├── UserContext.jsx       # Stores user profile (name, age, email, etc.)
│   ├── GoalsContext.jsx      # Stores fitness goals and weight tracking
│   └── WorkoutContext.jsx    # Stores active workout session data (reps, calories, feedback)
│
├── pages/
│   ├── layout.jsx            # Wrapper that adds navbar to all pages
│   │
│   ├── HomePage/
│   │   ├── SignIn.jsx        # Login page
│   │   ├── SignUp.jsx        # Registration page
│   │   ├── ProfileSetup.jsx  # First-time user profile creation
│   │   └── HomeDashboard.jsx # Main dashboard after login
│   │
│   ├── GoalsPage/
│   │   ├── SetGoals.jsx      # Create new fitness goal
│   │   ├── EnterWeight.jsx   # Input starting weight
│   │   ├── UpdateWeight.jsx  # Log daily weight
│   │   ├── EditGoalWeight.jsx # Change target weight
│   │   └── GoalsDashboard.jsx # View goal progress
│   │
│   ├── ProfilePage/
│   │   └── ProfileView.jsx   # View user profile
│   │
│   ├── SettingsPage/
│   │   ├── EditProfile.jsx   # Update user info
│   │   └── Logout.jsx        # Sign out
│   │
│   └── WorkoutsPage/
│       ├── LevelSelect.jsx   # Choose difficulty (beginner/intermediate/advanced)
│       ├── ExerciseMenu.jsx  # Pick an exercise
│       ├── DemoView.jsx      # Watch exercise demo video
│       │
│       └── WorkoutSession/
│           ├── WorkoutSessionWrapper.jsx  # Main workout screen container
│           ├── PoseCamera.jsx            # Camera + AI pose detection
│           ├── FeedbackPanel.jsx         # Shows form feedback messages
│           ├── StatsPanel.jsx            # Displays reps, calories, accuracy
│           ├── EndSessionButton.jsx      # Button to stop workout
│           └── WorkoutSummary.jsx        # Post-workout results screen
│
├── utils/
│   ├── ExerciseDetector.js   # Core logic: analyzes body angles and counts reps
│   ├── LandmarkSmoother.js   # Reduces jitter in pose detection
│   └── SoundFeedback.js      # Manages audio cues and queuing
│
├── assets/                   # Exercise images (squat.png, bicep-curls.png, etc.)
└── sounds/                   # Audio files for feedback (encourage.mp3, form corrections, etc.)
```

## How to Run the Project

### Prerequisites
- **Node.js** (v16 or higher) installed on your computer

### Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:5173`

3. **Build for production** (optional)
   ```bash
   npm run build
   ```
   This creates an optimized build in the `dist/` folder

### Browser Requirements
- Modern browser (Chrome, Edge, Firefox, Safari)
- Camera permission required for workout sessions
- Microphone not needed

## Quick Start Guide

1. Open the app and sign up
2. Complete your profile (name, age, weight)
3. Set a fitness goal
4. Go to "Workouts" → Pick a level → Choose an exercise
5. Allow camera access
6. Follow the countdown and start exercising!
7. Watch the screen for real-time feedback on your form

---

**Made with React and powered by Google MediaPipe AI**

