import { useWorkout } from '../../../context/WorkoutContext';

function EndSessionButton({ onEnd }) {
  const { isActive } = useWorkout();

  const handleClick = () => {
    const ok = window.confirm('Are you sure? Your progress will be saved.');
    if (ok) onEnd();
  };

  return (
    <button className="end-session-btn" onClick={handleClick} disabled={!isActive}>End Session</button>
  );
}

export default EndSessionButton;


