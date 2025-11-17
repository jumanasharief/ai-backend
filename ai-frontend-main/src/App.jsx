import { BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom";
import { GoalsProvider } from "./context/GoalsContext";
import { UserProvider } from "./context/UserContext";
import { ToastProvider } from "./context/ToastContext";
import SignIn from "./pages/HomePage/SignIn";
import SignUp from "./pages/HomePage/SignUp";
import ProfileSetup from "./pages/HomePage/ProfileSetup";
import HomePage from "./pages/HomePage/HomePage";
import Goals from "./pages/Goals";
import LevelSelect from "./pages/WorkoutsPage/LevelSelect";
import ExerciseMenu from "./pages/WorkoutsPage/ExerciseMenu";
import DemoView from "./pages/WorkoutsPage/DemoView";
import { WorkoutProvider } from "./context/WorkoutContext";
import WorkoutSessionWrapper from "./pages/WorkoutsPage/WorkoutSession/WorkoutSessionWrapper";
import UpdateWeight from "./pages/GoalsPage/UpdateWeight";
import EditGoalWeight from "./pages/GoalsPage/EditGoalWeight";
import ProfileView from "./pages/ProfilePage/ProfileView";
import EditProfile from "./pages/SettingsPage/EditProfile";
import Logout from "./pages/SettingsPage/Logout";
import Layout from "./pages/layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ToastContainer from "./components/ToastContainer";
import "./App.css";

// Fixed App structure and routing with authentication protection
function App(){
  return(
    <ToastProvider>
      <UserProvider>
        <GoalsProvider>
          <WorkoutProvider>
            <Router>
              <ToastContainer />
              <Routes>
              {/* Public routes - no authentication required, no navbar */}
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              
              {/* Root route - redirects based on authentication */}
              <Route path="/" element={<Navigate to="/signup" replace />} />
              
              {/* Protected routes - require authentication, include navbar via Layout */}
              <Route path="/home" element={
                <ProtectedRoute>
                  <Layout><HomePage /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/goals" element={
                <ProtectedRoute>
                  <Layout><Goals /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/goals/update-weight" element={
                <ProtectedRoute>
                  <Layout><UpdateWeight /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/goals/edit-goal" element={
                <ProtectedRoute>
                  <Layout><EditGoalWeight /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Layout><ProfileView /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/settings/edit-profile" element={
                <ProtectedRoute>
                  <Layout><EditProfile /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/settings/logout" element={
                <ProtectedRoute>
                  <Layout><Logout /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/workouts">
                <Route index element={
                  <ProtectedRoute>
                    <Layout><LevelSelect /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="exercise" element={
                  <ProtectedRoute>
                    <Layout><ExerciseMenu /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="demo" element={
                  <ProtectedRoute>
                    <Layout><DemoView /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="session" element={
                  <ProtectedRoute>
                    <Layout><WorkoutSessionWrapper /></Layout>
                  </ProtectedRoute>
                } />
              </Route>
              </Routes>
            </Router>
          </WorkoutProvider>
        </GoalsProvider>
      </UserProvider>
    </ToastProvider>
  )
}

export default App
