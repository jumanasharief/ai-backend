import { useGoals } from '../../context/GoalsContext';

function SetGoals({ onContinue }) {
  const { goal, updateGoal } = useGoals();

  const handleGoalSelection = (e) => {
    console.log('=== SELECTING GOAL TYPE ===');
    console.log('Selected goal:', e.target.value);
    console.log('Saving to:', 'GoalsContext via updateGoal');
    
    updateGoal(e.target.value);
    
    console.log('After save - localStorage verification:', localStorage.getItem('goalsData'));
    console.log('==================');
  };

  return (
    <div className="goals-container">
      <h2>Set Your Goal</h2>
      <p>What would you like to focus on?</p>
      
      <div className="goal-options">
        <label className={`goal-option ${goal === "lose-weight" ? "selected" : ""}`}>
          <input
            type="radio"
            value="lose-weight"
            checked={goal === "lose-weight"}
            onChange={handleGoalSelection} />
          <div className="goal-content">
            <h3>Lose weight</h3>
            <p>Burn calories and increase stamina</p>
          </div>
        </label>
        
        <label className={`goal-option ${goal === "build-muscle" ? "selected" : ""}`}>
          <input
            type="radio"
            value="build-muscle"
            checked={goal === "build-muscle"}
            onChange={handleGoalSelection} />
          <div className="goal-content">
            <h3>Build muscle</h3>
            <p>Tone muscles and get stronger</p>
          </div>
        </label>
        
        <label className={`goal-option ${goal === "maintain-weight" ? "selected" : ""}`}>
          <input
            type="radio"
            value="maintain-weight"
            checked={goal === "maintain-weight"}
            onChange={handleGoalSelection} />
          <div className="goal-content">
            <h3>Maintain weight</h3>
            <p>Stretch deeper and move better</p>
          </div>
        </label>
      </div>
      
      <button 
        className="continue-btn" 
        onClick={onContinue}
        disabled={!goal}
      >
        Continue
      </button>
    </div>
  );
}

export default SetGoals;
