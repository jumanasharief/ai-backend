import { useState, useEffect } from 'react';
import { useGoals } from '../../context/GoalsContext';
import { useNavigate } from 'react-router-dom';

function EditGoalWeight() {
  const { goalWeight, updateGoalWeight } = useGoals();
  const navigate = useNavigate();
  const [newGoalWeight, setNewGoalWeight] = useState(goalWeight || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setNewGoalWeight(goalWeight || '');
  }, [goalWeight]);

  const handleGoalWeightChange = (e) => {
    setNewGoalWeight(e.target.value);
    setError('');
  };

  const handleSave = () => {
    try {
      const weight = parseFloat(newGoalWeight);
      
      if (isNaN(weight) || weight <= 0) {
        setError('Please enter a valid goal weight');
        return;
      }

      if (weight < 30 || weight > 300) {
        setError('Goal weight must be between 30kg and 300kg');
        return;
      }

      if (weight === goalWeight) {
        setError('Goal weight is the same as current goal');
        return;
      }

      // Update goal weight
      updateGoalWeight(weight);
      
      // Navigate back to dashboard
      navigate('/goals');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    navigate('/goals');
  };

  return (
    <div className="edit-goal-container">
      <h2>Edit Goal Weight</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="goal-weight-input">
        <label htmlFor="goalWeight">Goal Weight (kg)</label>
        <input
          id="goalWeight"
          type="number"
          value={newGoalWeight}
          onChange={handleGoalWeightChange}
          placeholder="Enter goal weight"
          min="30"
          max="300"
          step="0.1"
        />
        <p className="input-help">
          Enter your target weight (30-300 kg)
        </p>
      </div>
      
      <div className="action-buttons">
        <button 
          className="cancel-btn" 
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button 
          className="save-btn" 
          onClick={handleSave}
          disabled={!newGoalWeight || newGoalWeight === goalWeight}
        >
          Save Goal
        </button>
      </div>
    </div>
  );
}

export default EditGoalWeight;
