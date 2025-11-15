import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkout } from '../../../context/WorkoutContext';
import FeedbackPanel from './FeedbackPanel';
import StatsPanel from './StatsPanel';
import EndSessionButton from './EndSessionButton';
import WorkoutSummary from './WorkoutSummary';
import PoseCamera from './PoseCamera';

function PlaceholderCamera() {
  return (
    <div className="pose-camera">
      <div className="pose-video">Camera preview will appear here</div>
    </div>
  );
}

function WorkoutSessionWrapper() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { startSession, isActive, endSession, level, currentExercise, startTime } = useWorkout();
  const [showSummary, setShowSummary] = useState(false);

  const initial = useMemo(() => ({
    level: state?.level || 'beginner',
    exercise: state?.exercise || 'squat',
  }), [state]);

  useEffect(() => {
    const ex = initial.exercise;
    const lv = initial.level;
    console.log('WorkoutSessionWrapper initial state:', { ex, lv, fullState: state });
    if (!isActive && ex && lv) {
      startSession(ex, lv);
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (isActive) {
        endSession();
      }
    };
  }, [isActive, endSession]);

  const onEnd = () => {
    endSession();
    setShowSummary(true);
  };

  const onDone = () => {
    setShowSummary(false);
    navigate('/workouts/exercise', { state: { level: level || initial.level } });
  };

  if (showSummary) return <WorkoutSummary startedAt={startTime} />;

  return (
    <div className="workout-session">
      <div className="session-main">
        <div className="session-header">
          <div className="session-title">{(currentExercise || initial.exercise).replace('-', ' ')} • {(level || initial.level)}</div>
        </div>
        <div className="session-left">
          <PoseCamera />
          <FeedbackPanel />
        </div>
      </div>
      <div className="session-bottom">
        <StatsPanel />
        <EndSessionButton onEnd={onEnd} />
      </div>
    </div>
  );
}

export default WorkoutSessionWrapper;


