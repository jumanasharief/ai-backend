import { useWorkout } from '../../../context/WorkoutContext';

function FeedbackPanel() {
  const { feedbackMessages } = useWorkout();
  const latestMessage = feedbackMessages[0];

  if (!latestMessage) {
    return (
      <div className="feedback-panel">
        <div className="feedback-item info">Get in position...</div>
      </div>
    );
  }

  return (
    <div className="feedback-panel">
      <div className={`feedback-item ${latestMessage.type}`}>
        {latestMessage.message}
      </div>
    </div>
  );
}

export default FeedbackPanel;


