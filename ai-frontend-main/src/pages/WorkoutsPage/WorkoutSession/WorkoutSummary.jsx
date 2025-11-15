import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../../../context/WorkoutContext';

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function WorkoutSummary({ startedAt }) {
  const navigate = useNavigate();
  const { currentExercise, level, calories, poseAccuracy, repCounts } = useWorkout();

  const durationMs = useMemo(() => (startedAt ? Date.now() - startedAt : 0), [startedAt]);

  const goToMenu = () => navigate('/workouts/exercise', { state: { level } });
  const startNew = () => navigate('/workouts');

  // build workout data for table
  const workoutData = [
    {
      exercise: (currentExercise || '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      duration: formatTime(durationMs),
      reps: repCounts?.[mapExerciseKey(currentExercise)] || 0,
      calories: calories,
      date: new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  ];

  return (
    <div className="workout-summary">
      <h2>Workout Complete!</h2>
      <p>Great job on your {level} workout!</p>
      
      {/* workout summary table */}
      <div className="summary-table-container">
        <table className="workout-summary-table">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Duration</th>
              <th>Reps</th>
              <th>Calories</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {workoutData.map((workout, index) => (
              <tr key={index}>
                <td className="exercise-name">{workout.exercise}</td>
                <td className="duration">{workout.duration}</td>
                <td className="reps">{workout.reps}</td>
                <td className="calories">{workout.calories}</td>
                <td className="date">{workout.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* overall stats */}
      <div className="overall-stats">
        <div className="stat-item">
          <span className="stat-label">Total Duration</span>
          <span className="stat-value">{formatTime(durationMs)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Reps</span>
          <span className="stat-value">{repCounts?.[mapExerciseKey(currentExercise)] || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Calories</span>
          <span className="stat-value">{calories}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Average Accuracy</span>
          <span className="stat-value">{poseAccuracy}%</span>
        </div>
      </div>

      <div className="action-buttons" style={{ justifyContent: 'center' }}>
        <button className="action-btn save-btn" onClick={startNew}>Start New Workout</button>
        <button className="action-btn delete-btn" onClick={goToMenu}>Done</button>
      </div>
    </div>
  );
}

function mapExerciseKey(ex) {
  if (!ex) return 'squat';
  if (ex === 'bicep-curl') return 'bicepCurl';
  if (ex === 'front-kick') return 'frontKick';
  if (ex === 'lateral-raise') return 'lateralRaise';
  return ex; // 'squat' stays as is
}

export default WorkoutSummary;


