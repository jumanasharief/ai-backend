import React, { useMemo } from 'react';
import { useUser } from '../../context/UserContext';
import { useGoals } from '../../context/GoalsContext';
import { useWorkout } from '../../context/WorkoutContext';
import { useNavigate } from 'react-router-dom';

const ProfileView = () => {
  // Get user data from context
  const { user } = useUser();
  const { currentWeight, goalWeight, goal } = useGoals();
  const { calories, workoutHistory } = useWorkout();
  
  const navigate = useNavigate();

  // Calculate age from birthdate
  const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Calculate workout statistics from workoutHistory
  const workoutStats = useMemo(() => {
    if (!workoutHistory || workoutHistory.length === 0) {
      return {
        totalWorkouts: 0,
        totalCalories: 0,
        memberSince: 'Recently',
        thisWeekWorkouts: 0,
        avgDuration: 0
      };
    }

    // Total workouts
    const totalWorkouts = workoutHistory.length;

    // Total calories
    const totalCalories = workoutHistory.reduce((sum, workout) => sum + (workout.calories || 0), 0);

    // Calculate workouts this week (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekWorkouts = workoutHistory.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate >= oneWeekAgo;
    }).length;

    // Calculate average duration in minutes
    const totalDuration = workoutHistory.reduce((sum, workout) => sum + (workout.duration || 0), 0);
    const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts / 60000) : 0; // Convert ms to minutes

    // Member since - get the earliest workout date
    const sortedByDate = [...workoutHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstWorkout = sortedByDate[0];
    const memberSince = firstWorkout 
      ? new Date(firstWorkout.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Recently';

    return {
      totalWorkouts,
      totalCalories,
      memberSince,
      thisWeekWorkouts,
      avgDuration
    };
  }, [workoutHistory]);

  return (
    <div className="profile-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-picture-section">
          {user.profilePicture ? (
            <img 
              src={user.profilePicture} 
              alt="Profile" 
              className="profile-picture"
            />
          ) : (
            <div className="profile-picture-placeholder">
              <span className="profile-initial">
                {user.name ? user.name.charAt(0).toUpperCase() : '?'}
              </span>
            </div>
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{user.name || 'User'}</h1>
          <p className="profile-member-since">Member since {workoutStats.memberSince}</p>
        </div>
      </div>

      {/* Desktop two-column sections */}
      <div className="profile-sections-grid">
        <div className="profile-section">
          <h3 className="section-title">Personal Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{user.email || 'Not set'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Age</span>
              <span className="info-value">{user.age ? `${user.age} years` : (user.birthdate ? `${calculateAge(user.birthdate)} years` : 'Not set')}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Goal</span>
              <span className="info-value">{goal || 'Not set'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Current Weight</span>
              <span className="info-value">{currentWeight ? `${currentWeight} kg` : 'Not set'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Goal Weight</span>
              <span className="info-value">{goalWeight ? `${goalWeight} kg` : 'Not set'}</span>
            </div>
          </div>
        </div>
        <div className="profile-section">
          <h3 className="section-title">Fitness Stats</h3>
          <div className="stats-grid">
            <div className="info-item">
              <span className="info-label">Total Workouts</span>
              <span className="info-value">{workoutStats.totalWorkouts} sessions</span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Calories</span>
              <span className="info-value">{workoutStats.totalCalories.toLocaleString()} cal</span>
            </div>
            <div className="info-item">
              <span className="info-label">This Week</span>
              <span className="info-value">{workoutStats.thisWeekWorkouts} {workoutStats.thisWeekWorkouts === 1 ? 'workout' : 'workouts'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Avg Duration</span>
              <span className="info-value">{workoutStats.avgDuration} {workoutStats.avgDuration === 1 ? 'minute' : 'minutes'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Live Calories</span>
              <span className="info-value">{calories}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="profile-section account-actions">
        <h3 className="section-title">Account Actions</h3>
        <div className="actions-row">
          <button 
            className="settings-btn"
            onClick={() => navigate('/settings/edit-profile')}
          >
            <span className="settings-text">Update Profile</span>
          </button>
          <button 
            className="settings-btn"
            onClick={() => navigate('/goals')}
          >
            <span className="settings-text">Manage Goals</span>
          </button>
          {/* <button 
            className="settings-btn"
            onClick={() => navigate('/settings')}
          >
            <span className="settings-text">Privacy</span>
          </button> */}
          <button 
            className="settings-btn"
            onClick={() => navigate('/settings/logout')}
          >
            <span className="settings-text">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
