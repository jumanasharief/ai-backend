import { useLocation, useNavigate } from 'react-router-dom';
import squatImg from '../../assets/squat.png';
import bicepCurlImg from '../../assets/bicep-curls.png';
import frontKickImg from '../../assets/front-kick.png';
import overheadPressImg from '../../assets/overhead-press.png';
import lateralRaiseImg from '../../assets/lateral-raise.jpg';
import crunchImg from '../../assets/crunch.png';

function ExerciseMenu() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const level = state?.level || 'beginner';

  const goToDemo = (exercise) => {
    navigate('/workouts/demo', { state: { level, exercise } });
  };

  // Base calories for 15-minute beginner workouts
  const baseCalories = {
    'squat': 110,
    'bicep-curl': 55,
    'front-kick': 125,
    'overhead-press': 60,
    'lateral-raise': 55,
    'crunch': 56
  };

  // Duration multipliers based on level
  const levelMultipliers = {
    'beginner': 1,      // 15 minutes
    'intermediate': 2,  // 30 minutes  
    'advanced': 3       // 45 minutes
  };

  const calculateCalories = (exerciseId) => {
    const base = baseCalories[exerciseId] || 0;
    const multiplier = levelMultipliers[level] || 1;
    return Math.round(base * multiplier);
  };

  const exercises = [
    {
      id: 'squat',
      name: 'Squat',
      image: squatImg,
      calories: `~${calculateCalories('squat')} cal`,
      description: 'Lower body strength'
    },
    {
      id: 'crunch',
      name: 'Crunch',
      image: crunchImg,
      calories: `~${calculateCalories('crunch')} cal`,
      description: 'Core isolation'
    },
    {
      id: 'bicep-curl',
      name: 'Bicep Curl',
      image: bicepCurlImg,
      calories: `~${calculateCalories('bicep-curl')} cal`,
      description: 'Upper arm strength'
    },
    {
      id: 'front-kick',
      name: 'Front Kick',
      image: frontKickImg,
      calories: `~${calculateCalories('front-kick')} cal`,
      description: 'Martial arts cardio'
    },
    {
      id: 'overhead-press',
      name: 'Overhead Press',
      image: overheadPressImg,
      calories: `~${calculateCalories('overhead-press')} cal`,
      description: 'Shoulder strength'
    },
    {
      id: 'lateral-raise',
      name: 'Lateral Raise',
      image: lateralRaiseImg,
      calories: `~${calculateCalories('lateral-raise')} cal`,
      description: 'Shoulder isolation'
    }
  ];

  return (
    <div className="exercise-library">
      <div className="exercise-header">
        <h2>Choose an Exercise</h2>
        <p>Level: {level.charAt(0).toUpperCase() + level.slice(1)}</p>
      </div>
      
      <div className="exercise-grid">
        {exercises.map(exercise => (
          <div 
            key={exercise.id}
            className="exercise-card"
            onClick={() => goToDemo(exercise.id)}
          >
            <div className="exercise-image-container">
              <img 
                src={exercise.image} 
                alt={exercise.name}
                className="exercise-image"
              />
            </div>
            <div className="exercise-info">
              <h3 className="exercise-name">{exercise.name}</h3>
              <p className="exercise-calories">{exercise.calories}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExerciseMenu;


