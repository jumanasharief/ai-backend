import { useUser } from '../../context/UserContext';
import { useGoals } from '../../context/GoalsContext';
import { useWorkout } from '../../context/WorkoutContext';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function HomeDashboard() {
  const { user } = useUser();
  const { currentWeight, goalWeight, progress, weightHistory } = useGoals();
  const { lastWorkout, workoutHistory } = useWorkout();
  const navigate = useNavigate();

  // Get current time for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Helper function to format duration from milliseconds
  const formatDuration = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // Get last 7 days for chart labels
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  // Process weight data for chart
  const processWeightData = () => {
    const last7Days = getLast7Days();
    const weightMap = {};
    
    weightHistory.forEach(entry => {
      weightMap[entry.date] = entry.weight;
    });

    return {
      labels: last7Days.map(date => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      data: last7Days.map(date => weightMap[date] || null)
    };
  };

  // Process accuracy data for chart (average accuracy per day)
  const processAccuracyData = () => {
    const last7Days = getLast7Days();
    const accuracyByDay = {};

    workoutHistory.forEach(workout => {
      const workoutDate = workout.date.split('T')[0];
      if (last7Days.includes(workoutDate)) {
        if (!accuracyByDay[workoutDate]) {
          accuracyByDay[workoutDate] = { total: 0, count: 0 };
        }
        accuracyByDay[workoutDate].total += workout.accuracy || 0;
        accuracyByDay[workoutDate].count += 1;
      }
    });

    return {
      labels: last7Days.map(date => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      data: last7Days.map(date => {
        if (accuracyByDay[date]) {
          return (accuracyByDay[date].total / accuracyByDay[date].count).toFixed(1);
        }
        return null;
      })
    };
  };

  // Process duration data for chart (total minutes per day)
  const processDurationData = () => {
    const last7Days = getLast7Days();
    const durationByDay = {};

    workoutHistory.forEach(workout => {
      const workoutDate = workout.date.split('T')[0];
      if (last7Days.includes(workoutDate)) {
        if (!durationByDay[workoutDate]) {
          durationByDay[workoutDate] = 0;
        }
        durationByDay[workoutDate] += workout.duration || 0;
      }
    });

    return {
      labels: last7Days.map(date => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      data: last7Days.map(date => {
        if (durationByDay[date]) {
          return (durationByDay[date] / 60000).toFixed(1); // Convert ms to minutes
        }
        return null;
      })
    };
  };

  // Common chart options
  const getChartOptions = (title, yAxisLabel, stepSize = null, suggestedMax = null) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: title,
        color: '#333',
        font: {
          size: 14,
          weight: '600'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${yAxisLabel}: ${context.parsed.y}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          stepSize: stepSize,
          color: '#666',
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ...(suggestedMax && { suggestedMax })
      },
      x: {
        ticks: {
          color: '#666',
          font: {
            size: 11
          }
        },
        grid: {
          display: false
        }
      }
    }
  });

  // Prepare chart data
  const weightData = processWeightData();
  const accuracyData = processAccuracyData();
  const durationData = processDurationData();

  const weightChartData = {
    labels: weightData.labels,
    datasets: [{
      label: 'Weight (kg)',
      data: weightData.data,
      borderColor: '#2A7337',
      backgroundColor: 'rgba(42, 115, 55, 0.1)',
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      spanGaps: true
    }]
  };

  const accuracyChartData = {
    labels: accuracyData.labels,
    datasets: [{
      label: 'Accuracy (%)',
      data: accuracyData.data,
      borderColor: '#2A7337',
      backgroundColor: 'rgba(42, 115, 55, 0.1)',
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      spanGaps: true
    }]
  };

  const durationChartData = {
    labels: durationData.labels,
    datasets: [{
      label: 'Duration (min)',
      data: durationData.data,
      borderColor: '#2A7337',
      backgroundColor: 'rgba(42, 115, 55, 0.1)',
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      spanGaps: true
    }]
  };

  return (
    <div className="home-dashboard">
      <div className="dashboard-header">
        <h1>{getGreeting()}, {user.name || 'Ready to exercise'}!</h1>
        <p>Ready to exercise?</p>
      </div>

      <div className="dashboard-content">
        {/* Left Column: Widgets */}
        <div className="dashboard-widgets-section">
          {/* Last Workout Widget */}
          {lastWorkout ? (
            <div className="dashboard-widget">
              <h3>Last Workout</h3>
              <div className="workout-summary">
                <div className="workout-info">
                  <span className="workout-exercise">{lastWorkout.exercise}</span>
                  <span className="workout-date">{new Date(lastWorkout.date).toLocaleDateString()}</span>
                </div>
                <div className="workout-stats">
                  <div className="stat">
                    <span className="stat-label">Duration</span>
                    <span className="stat-value">{formatDuration(lastWorkout.duration)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Reps</span>
                    <span className="stat-value">{lastWorkout.reps}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Calories</span>
                    <span className="stat-value">{lastWorkout.calories}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard-widget">
              <h3>Last Workout</h3>
              <div className="workout-summary">
                <p style={{ textAlign: 'center', padding: '1rem' }}>
                  No workouts yet. Start your first workout!
                </p>
              </div>
            </div>
          )}

          {/* Progress Widget */}
          {currentWeight && goalWeight && (
            <div className="dashboard-widget">
              <h3>Goal Progress</h3>
              <div className="progress-summary">
                <div className="progress-info">
                  <span className="current-weight">{currentWeight} kg</span>
                  <span className="goal-weight">→ {goalWeight} kg</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="progress-text">{progress.toFixed(1)}% complete</span>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="dashboard-actions">
            <button 
              className="action-btn primary"
              onClick={() => navigate('/workouts')}
            >
              Start Workout
            </button>
            <button 
              className="action-btn secondary"
              onClick={() => navigate('/workouts/exercise')}
            >
              Browse Exercises
            </button>
          </div>
        </div>

        {/* Right Column: Charts */}
        <div className="dashboard-charts-section">
          {/* Weight Change Chart */}
          <div className="dashboard-chart-container">
            <div className="chart-wrapper">
              <Line 
                data={weightChartData} 
                options={getChartOptions('Weight Change (7 Days)', 'Weight', 0.2)} 
              />
            </div>
          </div>

          {/* Accuracy Chart */}
          <div className="dashboard-chart-container">
            <div className="chart-wrapper">
              <Line 
                data={accuracyChartData} 
                options={getChartOptions('Accuracy Achieved (7 Days)', 'Accuracy (%)', null, 100)} 
              />
            </div>
          </div>

          {/* Duration Chart */}
          <div className="dashboard-chart-container">
            <div className="chart-wrapper">
              <Line 
                data={durationChartData} 
                options={getChartOptions('Workout Duration (7 Days)', 'Minutes')} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeDashboard;
