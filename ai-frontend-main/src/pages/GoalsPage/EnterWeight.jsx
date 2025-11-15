import { useState } from 'react';
import { useGoals } from '../../context/GoalsContext';

function EnterWeight({ onContinue }) {
  const { setInitialWeightValue, updateGoalWeight } = useGoals();
  const [currentWeight, setCurrentWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [error, setError] = useState('');

  const handleCurrentWeightChange = (e) => {
    setCurrentWeight(e.target.value);
    setError('');
  };

  const handleGoalWeightChange = (e) => {
    setGoalWeight(e.target.value);
    setError('');
  };

  const handleSave = () => {
    try {
      console.log('=== SAVING GOALS DURING ONBOARDING ===');
      console.log('Goal Type:', 'from previous step');
      console.log('Current Weight:', currentWeight);
      console.log('Goal Weight:', goalWeight);
      
      // Validate inputs
      if (!currentWeight || !goalWeight) {
        setError('Please enter both current weight and goal weight');
        return;
      }

      const current = parseFloat(currentWeight);
      const goal = parseFloat(goalWeight);

      if (isNaN(current) || isNaN(goal)) {
        setError('Please enter valid numbers');
        return;
      }

      if (current <= 0 || goal <= 0) {
        setError('Weights must be positive numbers');
        return;
      }

      if (current < 30 || current > 300 || goal < 30 || goal > 300) {
        setError('Weights must be between 30kg and 300kg');
        return;
      }

      console.log('Validation passed, saving to context...');
      console.log('Saving to:', 'GoalsContext via setInitialWeightValue and updateGoalWeight');
      
      // Save to context
      setInitialWeightValue(current);
      updateGoalWeight(goal);
      
      console.log('After save - localStorage verification:', localStorage.getItem('goalsData'));
      console.log('==================');
      
      onContinue();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="weight-input-container">
      <h2>Enter Your Weights</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="weight-inputs">
        {/* ONLY TWO INPUT FIELDS - Fixed the three inputs bug */}
        <input
          type="number"
          placeholder="Current Weight (kg)"
          value={currentWeight}
          onChange={handleCurrentWeightChange}
          min="30"
          max="300"
          step="0.1"
        />
        <input
          type="number"
          placeholder="Goal Weight (kg)"
          value={goalWeight}
          onChange={handleGoalWeightChange}
          min="30"
          max="300"
          step="0.1"
        />
      </div>
      
      <button 
        className="save-btn" 
        onClick={handleSave}
        disabled={!currentWeight || !goalWeight}
      >
        Save
      </button>
    </div>
  );
}

export default EnterWeight;
