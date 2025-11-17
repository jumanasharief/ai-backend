import { useWorkout } from '../../../context/WorkoutContext';
import { useToast } from '../../../context/ToastContext';

function EndSessionButton({ onEnd }) {
  const { isActive } = useWorkout();
  const { showConfirm } = useToast();

  const handleClick = () => {
    showConfirm(
      'Are you sure? Your progress will be saved.',
      () => {
        onEnd();
      },
      () => {
        // User cancelled, do nothing
      }
    );
  };

  return (
    <button className="end-session-btn" onClick={handleClick} disabled={!isActive}>End Session</button>
  );
}

export default EndSessionButton;


