import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

function LevelSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const onContinue = () => {
    if (!selected) return;
    navigate('/workouts/exercise', { state: { level: selected } });
  };

  return (
    <div className="goals-container">
      <h2>Select Your Level</h2>
      <p>Pick a workout length that fits your day.</p>
      <div className="goal-options">
        <div className={`goal-option ${selected === 'beginner' ? 'selected' : ''}`} onClick={() => setSelected('beginner')}>
          <div className="goal-content">
            <h3>Beginner</h3>
            <p>15 minutes • Easy pace</p>
          </div>
        </div>
        <div className={`goal-option ${selected === 'intermediate' ? 'selected' : ''}`} onClick={() => setSelected('intermediate')}>
          <div className="goal-content">
            <h3>Intermediate</h3>
            <p>30 minutes • Moderate challenge</p>
          </div>
        </div>
        <div className={`goal-option ${selected === 'advanced' ? 'selected' : ''}`} onClick={() => setSelected('advanced')}>
          <div className="goal-content">
            <h3>Advanced</h3>
            <p>45 minutes • High intensity</p>
          </div>
        </div>
      </div>
      <button className="continue-btn" onClick={onContinue} disabled={!selected}>Continue</button>
    </div>
  );
}

export default LevelSelect;


