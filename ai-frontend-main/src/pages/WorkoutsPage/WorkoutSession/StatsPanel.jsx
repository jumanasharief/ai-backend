import { useEffect, useState } from 'react';
import { useWorkout } from '../../../context/WorkoutContext';

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function StatsPanel() {
  const { startTime, isActive, calories, poseAccuracy, repCounts, currentExercise } = useWorkout();
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsedMs(0);
      return;
    }
    
    let intervalId;
    const tick = () => setElapsedMs(Date.now() - startTime);
    tick();
    if (isActive) intervalId = setInterval(tick, 1000);
    return () => intervalId && clearInterval(intervalId);
  }, [startTime, isActive]);

  return (
    <div className="stats-panel">
      <div className="stat-card">
        <div className="stat-label">Timer</div>
        <div className="stat-value">{formatTime(elapsedMs)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Reps</div>
        <div className="stat-value">{repCounts?.[mapExerciseKey(currentExercise)] || 0}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Calories</div>
        <div className="stat-value">{calories}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Accuracy</div>
        <div className="stat-value">{poseAccuracy}%</div>
      </div>
    </div>
  );
}

function mapExerciseKey(ex) {
  if (!ex) return 'squat';
  if (ex === 'bicep-curl') return 'bicepCurl';
  if (ex === 'front-kick') return 'frontKick';
  if (ex === 'overhead-press') return 'overheadPress';
  if (ex === 'lateral-raise') return 'lateralRaise';
  return ex; // 'squat' and 'crunch' stay as is
}

export default StatsPanel;


