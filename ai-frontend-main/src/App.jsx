import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoalsProvider } from "./context/GoalsContext";
import { WorkoutProvider } from "./context/WorkoutContext";
import { UserProvider, useUser } from "./context/UserContext";
import SignIn from "./pages/HomePage/SignIn";
import SignUp from "./pages/HomePage/SignUp";
import ProfileSetup from "./pages/HomePage/ProfileSetup";
import HomePage from "./pages/HomePage/HomePage";
import Goals from "./pages/Goals";
import LevelSelect from "./pages/WorkoutsPage/LevelSelect";
import ExerciseMenu from "./pages/WorkoutsPage/ExerciseMenu";
import DemoView from "./pages/WorkoutsPage/DemoView";
import WorkoutSessionWrapper from "./pages/WorkoutsPage/WorkoutSession/WorkoutSessionWrapper";
import UpdateWeight from "./pages/GoalsPage/UpdateWeight";
import EditGoalWeight from "./pages/GoalsPage/EditGoalWeight";
import ProfileView from "./pages/ProfilePage/ProfileView";
import EditProfile from "./pages/SettingsPage/EditProfile";
import Logout from "./pages/SettingsPage/Logout";
import Layout from "./pages/layout";
import "./App.css";
import { autoMigrate } from "./utils/migrateToFirebase";

function AppContent() {
  const { user, isAuthenticated } = useUser();

  useEffect(() => {
    if (isAuthenticated && user) {
      autoMigrate(user.uid).catch((error) => {
        console.error("Auto-migration failed", error);
      });
    }
  }, [isAuthenticated, user]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/goals" element={<Layout><Goals /></Layout>} />
        <Route path="/goals/update-weight" element={<Layout><UpdateWeight /></Layout>} />
        <Route path="/goals/edit-goal" element={<Layout><EditGoalWeight /></Layout>} />
        <Route path="/profile" element={<Layout><ProfileView /></Layout>} />
        <Route path="/settings/edit-profile" element={<Layout><EditProfile /></Layout>} />
        <Route path="/settings/logout" element={<Layout><Logout /></Layout>} />
        <Route path="/workouts" element={<Layout><LevelSelect /></Layout>} />
        <Route path="/workouts/exercise" element={<Layout><ExerciseMenu /></Layout>} />
        <Route path="/workouts/demo" element={<Layout><DemoView /></Layout>} />
        <Route path="/workouts/session" element={<Layout><WorkoutSessionWrapper /></Layout>} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <UserProvider>
      <GoalsProvider>
        <WorkoutProvider>
          <AppContent />
        </WorkoutProvider>
      </GoalsProvider>
    </UserProvider>
  );
}

export default App;