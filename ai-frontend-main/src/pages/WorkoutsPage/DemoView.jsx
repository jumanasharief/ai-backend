import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';

function DemoView() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const level = state?.level || 'beginner';
  const exercise = state?.exercise || 'squat';
  
  // YouTube video IDs for each exercise
  const exerciseVideos = {
    'squat': '2t3Ab7a2ZM4',
    'bicep-curl': 'uO_CNYidOw0',
    'front-kick': 'o5wZm9U-hgQ',
    'lateral-raise': 'kDqklk1ZESo',
    'crunch': '0t4t3IpiEao',
    'overhead-press': 'B-aVuyhvLHU'
  };
  
  const videoId = exerciseVideos[exercise] || exerciseVideos['squat'];
  
  // TEMP: Video upload feature for model testing
  const [videoFile, setVideoFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const startWorkout = () => {
    navigate('/workouts/session', { state: { level, exercise, videoFile } });
  };

  const goBack = () => navigate('/workouts/exercise', { state: { level } });

  return (
    <div className="goals-container text-center">
      <h2>Demo: {exercise.replace('-', ' ')}</h2>
      <p>Level: {level}</p>
      
      <div className="video-container">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={`${exercise} demonstration`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      
      {/* TEMP: Video upload feature for model testing */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        style={{ display: 'none' }}
      />
      {videoFile && (
        <p style={{ color: '#4caf50', marginTop: '10px' }}>
          ✓ Video selected: {videoFile.name}
        </p>
      )}
      
      <div className="action-buttons action-center">
        <button onClick={goBack} className="delete-btn action-btn">Back</button>
        <button onClick={triggerFileInput} className="action-btn" style={{ backgroundColor: '#2196F3' }}>Upload Video</button>
        <button onClick={startWorkout} className="save-btn action-btn">Start Workout</button>
      </div>
    </div>
  );
}

export default DemoView;


