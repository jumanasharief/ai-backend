import { useUser } from '../../context/UserContext';
import { useGoals } from '../../context/GoalsContext';
import { useWorkout } from '../../context/WorkoutContext';
import { useNavigate } from 'react-router-dom';

function HomeDashboard() {
  const { user } = useUser();
  const { currentWeight, goalWeight, progress } = useGoals();
  const { lastWorkout } = useWorkout();
  const navigate = useNavigate();

  // Get current time for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Helper function to format duration from milliseconds
  const formatDuration = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div className="home-dashboard">
      <div className="dashboard-header">
        <h1>{getGreeting()}, {user.name || 'Ready to exercise'}!</h1>
        <p>Ready to exercise?</p>
      </div>

      <div className="dashboard-content">
        {/* Last Workout Widget */}
        {lastWorkout ? (
          <div className="dashboard-widget">
            <h3>Last Workout</h3>
            <div className="workout-summary">
              <div className="workout-info">
                <span className="workout-exercise">{lastWorkout.exercise}</span>
                <span className="workout-date">{new Date(lastWorkout.date).toLocaleDateString()}</span>
              </div>
              <div className="workout-stats">
                <div className="stat">
                  <span className="stat-label">Duration</span>
                  <span className="stat-value">{formatDuration(lastWorkout.duration)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Reps</span>
                  <span className="stat-value">{lastWorkout.reps}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Calories</span>
                  <span className="stat-value">{lastWorkout.calories}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="dashboard-widget">
            <h3>Last Workout</h3>
            <div className="workout-summary">
              <p style={{ textAlign: 'center', padding: '1rem' }}>
                No workouts yet. Start your first workout!
              </p>
            </div>
          </div>
        )}

        {/* Progress Widget */}
        {currentWeight && goalWeight && (
          <div className="dashboard-widget">
            <h3>Goal Progress</h3>
            <div className="progress-summary">
              <div className="progress-info">
                <span className="current-weight">{currentWeight} kg</span>
                <span className="goal-weight">→ {goalWeight} kg</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{progress.toFixed(1)}% complete</span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="dashboard-actions">
          <button 
            className="action-btn primary"
            onClick={() => navigate('/workouts')}
          >
            Start Workout
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => navigate('/workouts/exercise')}
          >
            Browse Exercises
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomeDashboard;
