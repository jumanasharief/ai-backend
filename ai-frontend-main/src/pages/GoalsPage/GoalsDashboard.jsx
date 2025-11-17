import { useState, useEffect } from 'react';
import { useGoals } from '../../context/GoalsContext';
import { useNavigate } from 'react-router-dom';

function GoalsDashboard() {
  const { 
    currentWeight, 
    goalWeight, 
    initialWeight, 
    progress, 
    goal 
  } = useGoals();
  
  const navigate = useNavigate();
  const [dataLoaded, setDataLoaded] = useState(false);

  // Debug logging to help identify data issues
  console.log('GoalsDashboard - received data:', {
    currentWeight,
    goalWeight,
    initialWeight,
    progress,
    goal
  });

  // Wait for data to load from localStorage
  useEffect(() => {
    // Give Context time to load from localStorage
    const timer = setTimeout(() => {
      setDataLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Show loading state while data is being loaded
  if (!dataLoaded) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Loading your goals...</p>
      </div>
    );
  }

  // Show setup message if data is not available
  // Check for null/undefined, not falsy values (0 is falsy but valid weight)
  if (currentWeight === null || goalWeight === null || !goal) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>Setting up your goals...</h2>
        <p>It looks like your goals aren't set up yet. Let's fix that!</p>
        <button onClick={() => navigate('/goals')}>
          Set Up Goals
        </button>
      </div>
    );
  }

  const getProgressColor = () => {
    if (progress <= 33) return '#ff4444'; // Red
    if (progress <= 66) return '#ffaa00'; // Yellow
    return '#44ff44'; // Green
  };

  const getWeightChange = () => {
    if (!currentWeight || !initialWeight) return 0;
    return currentWeight - initialWeight;
  };

  const weightChange = getWeightChange();
  const isWeightLoss = weightChange < 0;
  const isWeightGain = weightChange > 0;

  return (
    <div className="body-data-container">
      <h2>Body Data</h2>
      
      {/* Current Weight Display */}
      <div className="weight-display">
        <div className="weight-change">
          <span className="weight-change-icon">
            {isWeightLoss ? '-' : isWeightGain ? '+' : ''}
          </span>
          <span className="weight-change-value">
            {Math.abs(weightChange).toFixed(1)} kg
          </span>
        </div>
        <div className="current-weight">
          <span className="weight-value">{currentWeight} kg</span>
          <p className="weight-message">
            {isWeightLoss 
              ? `Great! Your weight is ${Math.abs(weightChange).toFixed(1)} kg less than when you started`
              : isWeightGain 
              ? `Your weight has increased by ${weightChange.toFixed(1)} kg`
              : 'Your weight is the same as when you started'
            }
          </p>
          <button 
            className="update-btn" 
            onClick={() => navigate('/goals/update-weight')}
          >
            Update Weight
          </button>
        </div>
      </div>
      
      {/* Goal Progress Section */}
      <div className="goal-section">
        <div className="goal-header">
          <h3>Goal: {goal}</h3>
          <button 
            className="edit-goal-btn" 
            onClick={() => navigate('/goals/edit-goal')}
          >
            ✏️
          </button>
        </div>
        
        <div className="progress-display">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{
                width: `${progress}%`,
                backgroundColor: getProgressColor()
              }}
            ></div>
          </div>
        </div>
        
        <div className="progress-labels">
          <div className="progress-start">
            <span className="progress-weight">{initialWeight} kg</span>
            <span className="progress-label">Starting</span>
          </div>
          <div className="progress-center">
            <span className="progress-percentage">&gt;&gt;</span>
            <span className="progress-percentage">{progress.toFixed(1)}%</span>
          </div>
          <div className="progress-goal">
            <span className="progress-weight">{goalWeight} kg</span>
            <span className="progress-label">Goal</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GoalsDashboard;
