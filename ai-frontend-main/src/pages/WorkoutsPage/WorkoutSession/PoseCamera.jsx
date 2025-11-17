import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkout } from '../../../context/WorkoutContext';
import { ExerciseDetector } from '../../../utils/ExerciseDetector';
import { LandmarkSmoother } from '../../../utils/LandmarkSmoother';

// hold mediapipe classes loaded at runtime
let PoseLandmarker, FilesetResolver, DrawingUtils;

export default function PoseCamera() {
  const { state } = useLocation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const animationIdRef = useRef(null);
  const initializedRef = useRef(false);
  const drawingUtilsRef = useRef(null);
  const landmarkSmootherRef = useRef(null);
  
  // TEMP: Video upload feature - detect if we're in video file mode
  const videoFileRef = useRef(state?.videoFile);
  const isVideoMode = !!videoFileRef.current;
  
  // keep a single detector instance
  const detectorRef = useRef(null);

  // show a countdown before starting detection
  const [countdown, setCountdown] = useState(10);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const workoutStartedRef = useRef(false);
  const countdownIntervalRef = useRef(null);
  
  // detect rest state based on low movement
  const [isResting, setIsResting] = useState(false);
  const restDetectionRef = useRef({ frameCount: 0, lastMovement: 0 });

  const { currentExercise, addFeedback, clearFeedback, feedbackMessages, updateRepCount, startTimer } = useWorkout();
  const currentExerciseRef = useRef(currentExercise);

  // Initialize detector once
  if (!detectorRef.current) {
    detectorRef.current = new ExerciseDetector(addFeedback);
  }

  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing AI Coach...');

  // filter landmarks by visibility and confidence
  const filterLandmarksByVisibility = (landmarks) => {
    return landmarks.filter(landmark => {
      const visibility = landmark.visibility || 1;
      const presence = landmark.presence || 1;
      return visibility >= 0.5 && presence >= 0.5;
    });
  };

  // detect if user is in rest state (minimal movement)
  const detectRestState = (landmarks) => {
    const now = Date.now();
    const detection = restDetectionRef.current;
    
    // calculate movement by comparing current landmarks to previous frame
    let totalMovement = 0;
    if (detection.lastLandmarks) {
      landmarks.forEach((landmark, index) => {
        if (detection.lastLandmarks[index]) {
          const dx = landmark.x - detection.lastLandmarks[index].x;
          const dy = landmark.y - detection.lastLandmarks[index].y;
          totalMovement += Math.sqrt(dx * dx + dy * dy);
        }
      });
    }
    
    // store current landmarks for next frame
    detection.lastLandmarks = landmarks.map(l => ({ x: l.x, y: l.y }));
    
    // if movement is below threshold, increment rest counter
    if (totalMovement < 0.01) { // Very small movement threshold
      detection.frameCount++;
    } else {
      detection.frameCount = 0;
      detection.lastMovement = now;
    }
    
    // consider resting if minimal movement for ~1s
    return detection.frameCount > 30;
  };

  useEffect(() => {
    currentExerciseRef.current = currentExercise;
  }, [currentExercise]);

  // keep ref in sync
  useEffect(() => {
    workoutStartedRef.current = workoutStarted;
  }, [workoutStarted]);

  // sync local rep counts to context periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (detectorRef.current) {
        updateRepCount('squat', detectorRef.current.getRepCount('squat'));
        updateRepCount('bicepCurl', detectorRef.current.getRepCount('bicepCurl'));
        updateRepCount('frontKick', detectorRef.current.getRepCount('frontKick'));
        updateRepCount('overheadPress', detectorRef.current.getRepCount('overheadPress'));
        updateRepCount('lateralRaise', detectorRef.current.getRepCount('lateralRaise'));
        updateRepCount('crunch', detectorRef.current.getRepCount('crunch'));
      }
    }, 500); // Update twice per second
    return () => clearInterval(interval);
  }, [updateRepCount]);

  // start countdown after camera initialization
  useEffect(() => {
    if (!isLoading && !error && currentExercise && !workoutStarted) {
      // reset detector for new exercise
      if (detectorRef.current) {
        const exerciseKey = currentExercise === 'bicep-curl' ? 'bicepCurl' : 
                           currentExercise === 'front-kick' ? 'frontKick' : 
                           currentExercise === 'overhead-press' ? 'overheadPress' : 
                           currentExercise === 'lateral-raise' ? 'lateralRaise' : 
                           currentExercise === 'crunch' ? 'crunch' : currentExercise;
        detectorRef.current.reset(exerciseKey);
      }

      // TEMP: Skip countdown for uploaded videos, start immediately
      if (isVideoMode) {
        setCountdown(0);
        setWorkoutStarted(true);
        workoutStartedRef.current = true;
        startTimer();
        addFeedback('Go! 💪', 'success');
        try { detectorRef.current?.sound?.playOnce?.('starting'); } catch (_) {}
        return;
      }

      // start 10-second countdown (only if not already started)
      setCountdown(10);
      setWorkoutStarted(false);
      workoutStartedRef.current = false;
      
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            setWorkoutStarted(true);
            workoutStartedRef.current = true;
            startTimer();
            addFeedback('Go! 💪', 'success');
            // Play session start sound once
            try { detectorRef.current?.sound?.playOnce?.('starting'); } catch (_) {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [isLoading, error, currentExercise, workoutStarted, addFeedback, startTimer, isVideoMode]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    // start camera and mediapipe loading in parallel
    const initializeEverything = async () => {
      try {
        // TEMP: For video upload mode, load video file instead of camera
        if (isVideoMode) {
          setLoadingMessage('Loading video file...');
          const videoPromise = initializeVideoFile();
          
          // load mediapipe in parallel
          setLoadingMessage('Loading AI models...');
          const mediaPipePromise = loadMediaPipe();
          
          await Promise.allSettled([videoPromise, mediaPipePromise]);
        } else {
          // request camera access immediately
          setLoadingMessage('Requesting camera access...');
          const cameraPromise = initializeCamera();
          
          // load mediapipe in parallel
          setLoadingMessage('Loading AI models...');
          const mediaPipePromise = loadMediaPipe();
          
          // wait for both; UI dismisses when camera opens
          await Promise.allSettled([cameraPromise, mediaPipePromise]);
        }
      } catch (err) {
        console.error('Initialization failed:', err);
        setError('Failed to initialize AI Coach');
        setIsLoading(false);
      }
    };

    const loadMediaPipe = async () => {
      try {
        const module = await import('https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0');
        PoseLandmarker = module.PoseLandmarker;
        FilesetResolver = module.FilesetResolver;
        DrawingUtils = module.DrawingUtils;
        await initializePoseLandmarker();
      } catch (err) {
        console.error('Failed to load MediaPipe:', err);
        // allow preview to continue even if model fails
        setError('Failed to load pose detection library');
      }
    };

    initializeEverything();
    return () => {
      cleanup();
      initializedRef.current = false;
    };
  }, [isVideoMode]);

  const initializePoseLandmarker = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );

      try {
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.7
        });
      } catch (gpuErr) {
        console.warn('GPU delegate failed, falling back to CPU:', gpuErr);
        setLoadingMessage('GPU not available, using CPU...');
        // fallback to CPU
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.7
        });
      }
    } catch (err) {
      console.error('PoseLandmarker initialization failed:', err);
      // allow preview to continue
      setError('Failed to initialize pose detection');
    }
  };

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          // start rendering immediately regardless of model readiness
          startDetection();
          // dismiss loading as soon as camera opens
          setIsLoading(false);
          setLoadingMessage('');
        };
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setError('Camera access denied. Please allow camera permissions.');
      setIsLoading(false);
    }
  };

  // TEMP: Video upload feature - initialize from uploaded video file
  const initializeVideoFile = async () => {
    try {
      const videoFile = videoFileRef.current;
      if (!videoFile || !videoRef.current) {
        throw new Error('No video file provided');
      }

      const videoUrl = URL.createObjectURL(videoFile);
      videoRef.current.src = videoUrl;
      videoRef.current.loop = true; // Loop the video for continuous testing
      
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play();
        // start rendering immediately
        startDetection();
        // dismiss loading
        setIsLoading(false);
        setLoadingMessage('');
      };

      videoRef.current.onerror = () => {
        throw new Error('Failed to load video file');
      };
    } catch (err) {
      console.error('Video file loading failed:', err);
      setError('Failed to load video file. Please try a different video.');
      setIsLoading(false);
    }
  };

  const startDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (animationIdRef.current) return; // already running

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const detectPose = async () => {
      if (!video || video.paused || video.ended) return;

      try {
        const startTimeMs = performance.now();

        // draw the live video frame first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // lazily initialize drawing utils when available
        if (!drawingUtilsRef.current && DrawingUtils) {
          drawingUtilsRef.current = new DrawingUtils(ctx);
        }

        // run detection only if the model is ready
        let results = null;
        if (poseLandmarkerRef.current) {
          results = await poseLandmarkerRef.current.detectForVideo(video, startTimeMs);
        }

        if (results && results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];

          // initialize landmark smoother if needed
          if (!landmarkSmootherRef.current) {
            landmarkSmootherRef.current = new LandmarkSmoother(0.3);
          }
          
          // smooth landmarks to reduce jitter
          const smoothedLandmarks = landmarkSmootherRef.current.smooth(landmarks);
          
          // detect rest state (minimal movement)
          const isCurrentlyResting = detectRestState(landmarks);
          setIsResting(isCurrentlyResting);
          
          // draw skeleton when we have landmarks and not resting
          if (smoothedLandmarks && smoothedLandmarks.length > 0 && !isCurrentlyResting && drawingUtilsRef.current && PoseLandmarker) {
            drawingUtilsRef.current.drawConnectors(
              smoothedLandmarks,
              PoseLandmarker.POSE_CONNECTIONS,
              { color: '#00FF00', lineWidth: 4 }
            );

            drawingUtilsRef.current.drawLandmarks(
              smoothedLandmarks,
              { color: '#FF0000', lineWidth: 2, radius: 6 }
            );
          }

          // check posture only when exercise is set
          const exercise = currentExerciseRef.current;
          if (exercise && exercise !== 'null') {
            checkPosture(landmarks);
            console.log('Exercise:', exercise, 'Workout started:', workoutStartedRef.current, 'Detector:', !!detectorRef.current);
          }
        } else {
          // No landmarks detected - reset smoother
          if (landmarkSmootherRef.current) {
            landmarkSmootherRef.current.reset();
          }
        }
      } catch (err) {
        console.error('Detection error:', err);
      }

      // schedule next frame
      animationIdRef.current = requestAnimationFrame(detectPose);
    };

    detectPose();
  };

  const checkPosture = (landmarks) => {
    const exercise = currentExerciseRef.current;
    if (!exercise) return;

    switch (exercise) {
      case 'squat':
        checkSquatPosture(landmarks);
        break;
      case 'bicep-curl':
        checkBicepCurlPosture(landmarks);
        break;
      case 'front-kick':
        checkFrontKickPosture(landmarks);
        break;
      case 'overhead-press':
        checkOverheadPressPosture(landmarks);
        break;
      case 'lateral-raise':
        checkLateralRaisePosture(landmarks);
        break;
      case 'crunch':
        checkCrunchPosture(landmarks);
        break;
      default:
        console.warn('Unknown exercise:', exercise);
    }
  };

  const checkSquatPosture = (landmarks) => {
    if (!workoutStartedRef.current || !detectorRef.current) return;
    detectorRef.current.detectSquat(landmarks);
    // Test detector state every 30 frames
    if (Math.random() < 0.03) {
      detectorRef.current.testDetection();
    }
  };

  const checkBicepCurlPosture = (landmarks) => {
    if (!workoutStartedRef.current || !detectorRef.current) return;
    detectorRef.current.detectBicepCurl(landmarks);
  };

  const checkFrontKickPosture = (landmarks) => {
    if (!workoutStartedRef.current || !detectorRef.current) return;
    detectorRef.current.detectFrontKick(landmarks);
  };

  const checkOverheadPressPosture = (landmarks) => {
    if (!workoutStartedRef.current || !detectorRef.current) return;
    detectorRef.current.detectOverheadPress(landmarks);
  };

  const checkLateralRaisePosture = (landmarks) => {
    if (!workoutStartedRef.current || !detectorRef.current) return;
    detectorRef.current.detectLateralRaise(landmarks);
  };

  const checkCrunchPosture = (landmarks) => {
    if (!workoutStartedRef.current || !detectorRef.current) return;
    detectorRef.current.detectCrunch(landmarks);
  };

  const cleanup = () => {
    try { detectorRef.current?.sound?.stopAll?.(); } catch (_) {}
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (poseLandmarkerRef.current) poseLandmarkerRef.current.close();
    
    // TEMP: Clean up video URL if in video mode
    if (isVideoMode && videoRef.current && videoRef.current.src) {
      URL.revokeObjectURL(videoRef.current.src);
    }
  };

  return (
    <div className="camera-wrapper">
      {isLoading && (
        <div className="camera-loading">
          <div className="loading-spinner"></div>
          <p>{loadingMessage}</p>
        </div>
      )}
      {error && (
        <div className="camera-error">
          <p>❌ {error}</p>
        </div>
      )}
      {!workoutStarted && countdown > 0 && !isLoading && !error && (
        <div className="countdown-overlay">
          <div className="countdown-number">{countdown}</div>
          <p>Get ready...</p>
        </div>
      )}
      <video ref={videoRef} autoPlay playsInline muted className="pose-video-hidden" />
      <canvas ref={canvasRef} className="pose-canvas" />
    </div>
  );
}