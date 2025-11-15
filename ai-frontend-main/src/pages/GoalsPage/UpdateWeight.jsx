import { useState, useEffect } from 'react';
import { useGoals } from '../../context/GoalsContext';
import { useNavigate } from 'react-router-dom';

function UpdateWeight() {
  const { 
    currentWeight, 
    weightHistory, 
    updateCurrentWeight 
  } = useGoals();
  
  const navigate = useNavigate();
  const [newWeight, setNewWeight] = useState(currentWeight || '');
  const [error, setError] = useState('');

  // Get last 7 days for calendar display
  const getLast7Days = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = date.getDate();
      
      // Find weight entry for this date
      const weightEntry = weightHistory.find(entry => entry.date === dateStr);
      
      days.push({
        date: dateStr,
        dayName,
        dayNumber,
        weight: weightEntry?.weight || null,
        isToday: i === 0
      });
    }
    
    return days;
  };

  const last7Days = getLast7Days();

  const handleWeightChange = (e) => {
    setNewWeight(e.target.value);
    setError('');
  };

  const handleSave = () => {
    try {
      const weight = parseFloat(newWeight);
      
      if (isNaN(weight) || weight <= 0) {
        setError('Please enter a valid weight');
        return;
      }

      if (weight < 30 || weight > 300) {
        setError('Weight must be between 30kg and 300kg');
        return;
      }

      // Update current weight with today's date
      updateCurrentWeight(weight, new Date().toISOString().split('T')[0]);
      
      // Navigate back to dashboard
      navigate('/goals');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = () => {
    // For now, just clear the input
    setNewWeight('');
  };

  return (
    <div className="body-data-container">
      <h2>Update Weight</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {/* Calendar Header */}
      <div className="calendar-header">
        <h3>Last 7 Days</h3>
      </div>
      
      {/* Calendar Days */}
      <div className="calendar-days">
        {last7Days.map((day, index) => (
          <div 
            key={day.date} 
            className={`calendar-day ${day.isToday ? "selected" : ""}`}
          >
            <span className="day-name">{day.dayName}</span>
            <span className="day-number">{day.dayNumber}</span>
            {day.weight && (
              <span className="day-weight">{day.weight}kg</span>
            )}
          </div>
        ))}
      </div>
      
      {/* Weight Entry */}
      <div className="weight-entry">
        <div className="weight-input-display">
          <input
            type="number"
            value={newWeight}
            onChange={handleWeightChange}
            placeholder="Enter weight (kg)"
            min="30"
            max="300"
            step="0.1"
            className="weight-input"
          />
        </div>
        
        {/* Unit Display - KG only */}
        <div className="unit-display">
          <span className="unit-label">kg</span>
        </div>
        
        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="action-btn delete-btn" 
            onClick={handleDelete}
          >
            Clear
          </button>
          <button 
            className="action-btn save-btn" 
            onClick={handleSave}
            disabled={!newWeight}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateWeight;
