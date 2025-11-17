import SoundFeedback from './SoundFeedback';

export class ExerciseDetector {
  constructor(addFeedback) {
    this.addFeedback = addFeedback;
    this.currentExercise = null;
    
    this.frameCounts = {
      squat: { stage: 'standing', prevStage: 'standing', count: 0, stableFrames: 0 },
      bicepCurl: { stage: 'extended', prevStage: 'extended', count: 0, stableFrames: 0 },
      frontKick: { stage: 'ready', prevStage: 'ready', count: 0, stableFrames: 0 },
      overheadPress: { stage: 'start', prevStage: 'start', count: 0, stableFrames: 0 },
      lateralRaise: { stage: 'down', prevStage: 'down', count: 0, stableFrames: 0 },
      crunch: { stage: 'start', prevStage: 'start', count: 0, stableFrames: 0 }
    };
    
    this.repState = {
      squat: 'standing',
      bicepCurl: 'extended',
      frontKick: 'in',
      overheadPress: 'start',
      lateralRaise: 'down',
      crunch: 'start'
    };
    this.repStable = { squat: 0, bicepCurl: 0, frontKick: 0, overheadPress: 0, lateralRaise: 0, crunch: 0 };

    this.midwayFlags = {
      squat: false,
      bicepCurl: false,
      frontKick: false,
      overheadPress: false,
      lateralRaise: false,
      crunch: false
    };

    this.currentKickSide = null;

    this.smoothAngles = Object.create(null);
    this.errorStable = Object.create(null);
    this.formErrorFrames = Object.create(null);
    
    this.lastFeedback = {
      rep: 0,
      form: 0,
      encourage: 0
    };
    
    this.STABLE_FRAMES = 3;
    this.FK_STABLE_FRAMES = 2;

    this.sound = new SoundFeedback();
  }

  reset(exercise) {
    this.currentExercise = exercise;
    const state = this.frameCounts[exercise];
    if (state) {
      const initialStage = exercise === 'squat' ? 'standing' : 
                         exercise === 'bicepCurl' ? 'extended' : 
                         exercise === 'frontKick' ? 'ready' : 
                         exercise === 'overheadPress' ? 'start' : 
                         exercise === 'lateralRaise' ? 'down' : 
                         exercise === 'crunch' ? 'start' : 'start';
      state.stage = initialStage;
      state.prevStage = initialStage;
      state.count = 0;
      state.stableFrames = 0;
    }
    if (exercise === 'squat') {
      this.repState.squat = 'standing';
      this.repStable.squat = 0;
      this.midwayFlags.squat = false;
    } else if (exercise === 'bicepCurl') {
      this.repState.bicepCurl = 'extended';
      this.repStable.bicepCurl = 0;
      this.midwayFlags.bicepCurl = false;
    } else if (exercise === 'frontKick') {
      this.repState.frontKick = 'in';
      this.repStable.frontKick = 0;
      this.midwayFlags.frontKick = false;
      this.currentKickSide = null;
    } else if (exercise === 'overheadPress') {
      this.repState.overheadPress = 'start';
      this.repStable.overheadPress = 0;
      this.midwayFlags.overheadPress = false;
    } else if (exercise === 'lateralRaise') {
      this.repState.lateralRaise = 'down';
      this.repStable.lateralRaise = 0;
      this.midwayFlags.lateralRaise = false;
    } else if (exercise === 'crunch') {
      this.repState.crunch = 'start';
      this.repStable.crunch = 0;
      this.midwayFlags.crunch = false;
    }

    if (this.sound) this.sound.resetExercise(exercise);
  }

  getRepCount(exercise) {
    return this.frameCounts[exercise]?.count || 0;
  }

  canGiveFeedback(type) {
    const now = Date.now();
    const cooldowns = { rep: 0, form: 2000, encourage: 800 };
    return (now - this.lastFeedback[type]) >= cooldowns[type];
  }

  markFeedbackGiven(type) {
    this.lastFeedback[type] = Date.now();
  }

  isFormErrorStable(errorKey, hasError) {
    if (!this.formErrorFrames[errorKey]) {
      this.formErrorFrames[errorKey] = 0;
    }
    
    if (hasError) {
      this.formErrorFrames[errorKey]++;
      return this.formErrorFrames[errorKey] >= 5;
    } else {
      this.formErrorFrames[errorKey] = 0;
      return false;
    }
  }

  calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }

  calculateTorsoAngle(shoulder, hip) {
    const dx = shoulder.x - hip.x;
    const dy = shoulder.y - hip.y;
    const angle = Math.abs(Math.atan2(dx, dy) * 180.0 / Math.PI);
    return angle;
  }

  calculateTorsoAngleToFloor(shoulder, hip) {
    const dx = shoulder.x - hip.x;
    const dy = hip.y - shoulder.y;
    const angle = Math.abs(Math.atan2(dy, dx) * 180.0 / Math.PI);
    return angle;
  }

  calculateNeckAlignmentAngle(head, shoulder, hip) {
    return this.calculateAngle(head, shoulder, hip);
  }

  smooth(name, value, alpha = 0.5) {
    const prev = this.smoothAngles[name];
    const next = prev == null ? value : (alpha * prev + (1 - alpha) * value);
    this.smoothAngles[name] = next;
    return next;
  }

  getRequiredStableFrames(exercise) {
    return exercise === 'frontKick' ? 1 : this.STABLE_FRAMES;
  }

  pickSide(landmarks) {
    const getVis = (idx) => {
      const p = landmarks[idx];
      return p ? (p.visibility == null ? 1 : p.visibility) : 0;
    };
    const leftSum = getVis(11) + getVis(23) + getVis(25) + getVis(27);
    const rightSum = getVis(12) + getVis(24) + getVis(26) + getVis(28);
    return rightSum >= leftSum ? 'right' : 'left';
  }

  testDetection() {}

  updateStability(exercise, newStage) {
    const state = this.frameCounts[exercise];
    if (state.stage !== newStage) {
      state.prevStage = state.stage;
      state.stage = newStage;
      state.stableFrames = 1;
      return false;
    } else {
      state.stableFrames++;
      return state.stableFrames >= this.STABLE_FRAMES;
    }
  }

  detectSquat(landmarks) {
    const side = this.pickSide(landmarks);
    const idx = side === 'right' ? { shoulder: 12, hip: 24, knee: 26, ankle: 28 } : { shoulder: 11, hip: 23, knee: 25, ankle: 27 };
    const hip = landmarks[idx.hip];
    const knee = landmarks[idx.knee];
    const ankle = landmarks[idx.ankle];
    const shoulder = landmarks[idx.shoulder];

    if (!hip || !knee || !ankle || !shoulder) return;

    const visCore = [hip, knee, ankle, shoulder].every(p => (p && (p.visibility == null || p.visibility >= 0.5)));
    if (!visCore) return;

    const kneeAngleRaw = this.calculateAngle(hip, knee, ankle);
    const torsoAngleRaw = this.calculateTorsoAngle(shoulder, hip);
    const hipAngleRaw = this.calculateAngle(shoulder, hip, knee);

    const kneeAngle = this.smooth('squat.knee', kneeAngleRaw, 0.4);
    const torsoAngle = this.smooth('squat.torso', torsoAngleRaw, 0.4);
    const hipAngle = this.smooth('squat.hip', hipAngleRaw, 0.4);
    const ankleRef = landmarks[32] || { x: ankle.x + 0.001, y: ankle.y };
    const ankleAngleRaw = this.calculateAngle(knee, ankle, ankleRef);
    const ankleAngle = this.smooth('squat.ankle', ankleAngleRaw, 0.4);
    
    let newStage;
    
    if (kneeAngle > 150) {
      newStage = 'standing';
    } else if (kneeAngle > 135) {
      newStage = 'descending';
    } else if (kneeAngle > 115) {
      newStage = 'halfway';
    } else if (kneeAngle > 100) {
      newStage = 'deep';
    } else {
      newStage = 'bottom';
    }

    if (kneeAngle > 120 && newStage === 'descending') {
      if (!this.calibration) {
        this.calibration = { squat: { standingHipY: null } };
      }
      
      if (kneeAngle > 150 && !this.calibration.squat.standingHipY) {
        this.calibration.squat.standingHipY = hip.y;
      }
      
      if (this.calibration.squat.standingHipY) {
        const standingHipY = this.calibration.squat.standingHipY;
        const hipDrop = Math.abs(hip.y - standingHipY);
        const torsoLength = Math.abs(shoulder.y - hip.y);
        const normalizedDrop = torsoLength > 0 ? hipDrop / torsoLength : 0;
        
        if (normalizedDrop < 0.05) {
          newStage = 'standing';
        } else if (normalizedDrop < 0.15) {
          newStage = 'descending';
        } else if (normalizedDrop < 0.25) {
          newStage = 'halfway';
        } else if (normalizedDrop < 0.35) {
          newStage = 'deep';
        } else {
          newStage = 'bottom';
        }
      }
    }

    if (!this.updateStability('squat', newStage)) return;

    const state = this.frameCounts.squat;

    if (this.repState.squat === 'standing') {
      if (newStage === 'halfway' || newStage === 'deep' || newStage === 'bottom') {
        this.repState.squat = 'reached_depth';
      }
    } else if (this.repState.squat === 'reached_depth') {
      // User returning to standing after reaching depth - count rep
      if (newStage === 'standing') {
        state.count++;
        this.addFeedback(`Rep ${state.count} complete! 🏋️`, 'success');
        if (this.sound) this.sound.markRep('squat', state.count);
        this.markFeedbackGiven('rep');
        this.repState.squat = 'standing';
        // Reset midway flag when rep completes and user returns to start
        this.midwayFlags.squat = false;
        // Play encouragement every 5 reps
        if (state.count % 5 === 0 && this.canGiveFeedback('encourage')) {
          this.addFeedback('Keep it up! 💪', 'info');
          this.markFeedbackGiven('encourage');
        }
      }
    }
    
    // send progressive feedback during descent (ONCE per rep)
    if ((newStage === 'halfway' || newStage === 'deep') && !this.midwayFlags.squat && this.canGiveFeedback('encourage')) {
      this.addFeedback('Almost there! 🔥', 'info');
      if (this.sound) this.sound.midwayMaybePlay('squat');
      this.markFeedbackGiven('encourage');
      this.midwayFlags.squat = true; // Set flag to prevent repeated midway sounds
    }

    // form correction: forward lean based on shoulder-hip drift
    const shoulderHipX = Math.abs(shoulder.x - hip.x);
    const hasChestError = (newStage === 'deep' || newStage === 'bottom') && shoulderHipX > 0.2;
    if (hasChestError && this.canGiveFeedback('form')) {
      this.addFeedback('Keep chest up! 📐', 'error');
      if (this.sound) this.sound.play('squat.form', 'squat', { formError: true });
      this.markFeedbackGiven('form');
    } else if (!hasChestError) {
      if (this.sound) this.sound.clearFormError('squat.form', 'squat');
    }
  }

  // detect bicep curl
  detectBicepCurl(landmarks) {
    const shoulder = landmarks[12];
    const elbow = landmarks[14];
    const wrist = landmarks[16];

    if (!shoulder || !elbow || !wrist) return;

    // require core joints visible
    const hip = landmarks[24];
    const visCore = [shoulder, elbow, wrist, hip].every(p => (p && (p.visibility == null || p.visibility >= 0.5)));
    if (!visCore) return;

    const elbowAngleRaw = this.calculateAngle(shoulder, elbow, wrist);
    const torsoUpperArmAngleRaw = this.calculateAngle(hip, shoulder, elbow); // hip-shoulder-elbow

    // smooth angles (reduced alpha since landmarks are pre-smoothed)
    const elbowAngle = this.smooth('curl.elbow', elbowAngleRaw, 0.4);
    const torsoUpperArmAngle = this.smooth('curl.torsoArm', torsoUpperArmAngleRaw, 0.4);
    const shoulderElbowX = Math.abs(shoulder.x - elbow.x);
    
    let newStage;
    
    // Determine stage based on elbow angle
    if (elbowAngle > 160) {
      newStage = 'extended';
    } else if (elbowAngle > 120) {
      newStage = 'curling';
    } else if (elbowAngle > 90) {
      newStage = 'halfway';
    } else if (elbowAngle > 50) {
      newStage = 'almost';
    } else {
      newStage = 'contracted';
    }

    // Check if state is stable
    if (!this.updateStability('bicepCurl', newStage)) return;

    const state = this.frameCounts.bicepCurl;

    // count reps through contracted and extended states
    if (this.repState.bicepCurl === 'extended') {
      if (elbowAngle < 75 && torsoUpperArmAngle < 45) { // slightly relaxed
        this.repStable.bicepCurl += 1;
        if (this.repStable.bicepCurl >= this.STABLE_FRAMES) {
          this.repState.bicepCurl = 'contracted';
          this.repStable.bicepCurl = 0;
        }
      } else {
        this.repStable.bicepCurl = 0;
      }
    } else if (this.repState.bicepCurl === 'contracted') {
      if (elbowAngle >= 145 && elbowAngle <= 185 && torsoUpperArmAngle < 55) {
        this.repStable.bicepCurl += 1;
        if (this.repStable.bicepCurl >= this.STABLE_FRAMES) {
          state.count++;
          this.addFeedback(`Rep ${state.count} complete! 💪`, 'success');
          if (this.sound) this.sound.markRep('bicepCurl', state.count);
          this.markFeedbackGiven('rep');
          this.repState.bicepCurl = 'extended';
          this.repStable.bicepCurl = 0;
          // Reset midway flag when rep completes and user returns to start
          this.midwayFlags.bicepCurl = false;
          // Play encouragement every 5 reps
          if (state.count % 5 === 0 && this.canGiveFeedback('encourage')) {
            this.addFeedback('Keep it up! 💪', 'info');
            this.markFeedbackGiven('encourage');
          }
        }
      } else {
        this.repStable.bicepCurl = 0;
      }
    }
    
    // send progressive feedback during curl (ONCE per rep at midway point)
    if ((newStage === 'halfway' || newStage === 'almost') && !this.midwayFlags.bicepCurl && this.canGiveFeedback('encourage')) {
      this.addFeedback('Keep going! 🔥', 'info');
      if (this.sound) this.sound.midwayMaybePlay('bicepCurl');
      this.markFeedbackGiven('encourage');
      this.midwayFlags.bicepCurl = true; // Set flag to prevent repeated midway sounds
    }

    // form correction: elbow drift
    const hasElbowDrift = shoulderElbowX > 0.15;
    if (hasElbowDrift && this.canGiveFeedback('form')) {
      this.addFeedback('Keep elbow stable! 📍', 'error');
      if (this.sound) this.sound.play('bicep-curl.form', 'bicepCurl', { formError: true });
      this.markFeedbackGiven('form');
    } else if (!hasElbowDrift) {
      if (this.sound) this.sound.clearFormError('bicep-curl.form', 'bicepCurl');
    }
  }

  // detect front kick
  detectFrontKick(landmarks) {
    const side = this.pickSide(landmarks);
    const idx = side === 'right' ? { shoulder: 12, hip: 24, knee: 26, ankle: 28 } : { shoulder: 11, hip: 23, knee: 25, ankle: 27 };
    const shoulder = landmarks[idx.shoulder];
    const hip = landmarks[idx.hip];
    const knee = landmarks[idx.knee];
    const ankle = landmarks[idx.ankle];

    if (!shoulder || !hip || !knee || !ankle) return;

    // require core joints visible (more tolerant for fast kicks)
    const visOk = [hip, knee, ankle, shoulder].every(p => (p && (p.visibility == null || p.visibility >= 0.35)));
    if (!visOk) return;

    // Side change detection - reset state for clean transition
    if (this.currentKickSide !== side) {
      this.repState.frontKick = 'in';
      this.repStable.frontKick = 0;
      this.currentKickSide = side;
    }

    const legAngleRaw = this.calculateAngle(hip, knee, ankle);
    const hipAngleRaw = this.calculateAngle(shoulder, hip, knee);

    // Use side-specific smoothing keys to prevent data mixing between legs
    const legAngle = this.smooth(`kick.leg.${side}`, legAngleRaw, 0.7);
    const hipAngle = this.smooth(`kick.hip.${side}`, hipAngleRaw, 0.7);
    
    let newStage;
    
    // Determine stage based on leg angle
    if (legAngle < 90) {
      newStage = 'ready';
    } else if (legAngle < 120) {
      newStage = 'chambered';
    } else if (legAngle < 140) {
      newStage = 'extending';
    } else {
      newStage = 'extended';
    }

    // Check if state is stable
    if (!this.updateStability('frontKick', newStage)) return;

    const state = this.frameCounts.frontKick;

    // count reps through in, ready, and out states
    if (this.repState.frontKick === 'in') {
      if (legAngle < 60 && hipAngle < 80) {
        this.repStable.frontKick += 1;
        if (this.repStable.frontKick >= this.getRequiredStableFrames('frontKick')) {
          this.repState.frontKick = 'ready';
          this.repStable.frontKick = 0;
        }
      } else {
        this.repStable.frontKick = 0;
      }
    } else if (this.repState.frontKick === 'ready') {
      if (legAngle > 110 && (hipAngle >= 35 && hipAngle <= 150)) {
        this.repStable.frontKick += 1;
        if (this.repStable.frontKick >= this.getRequiredStableFrames('frontKick')) {
          this.repState.frontKick = 'out';
          this.repStable.frontKick = 0;
        }
      } else {
        this.repStable.frontKick = 0;
      }
    } else if (this.repState.frontKick === 'out') {
      if (legAngle < 60 && hipAngle < 80) {
        this.repStable.frontKick += 1;
        if (this.repStable.frontKick >= this.getRequiredStableFrames('frontKick')) {
          state.count++;
          this.addFeedback(`Kick ${state.count} complete! 🥋`, 'success');
          if (this.sound) this.sound.markRep('frontKick', state.count);
          this.markFeedbackGiven('rep');
          this.repState.frontKick = 'in';
          this.repStable.frontKick = 0;
          // Reset midway flag when rep completes and user returns to start
          this.midwayFlags.frontKick = false;
          // Play encouragement every 5 reps
          if (state.count % 5 === 0 && this.canGiveFeedback('encourage')) {
            this.addFeedback('Keep it up! 💪', 'info');
            this.markFeedbackGiven('encourage');
          }
        }
      } else {
        this.repStable.frontKick = 0;
      }
    }
    
    // send progressive feedback during kick (ONCE per rep at midway point)
    if ((newStage === 'extending' || newStage === 'extended') && !this.midwayFlags.frontKick && this.canGiveFeedback('encourage')) {
      this.addFeedback('Push through! 🥋', 'info');
      if (this.sound) this.sound.midwayMaybePlay('frontKick');
      this.markFeedbackGiven('encourage');
      this.midwayFlags.frontKick = true; // Set flag to prevent repeated midway sounds
    }

    // removed incorrect low-kick penalty; height varies by context
  }


// overhead press 
detectOverheadPress(landmarks) {
  // Get both arms' landmarks
  const leftShoulder = landmarks[11];
  const leftElbow = landmarks[13];
  const leftWrist = landmarks[15];
  const leftHip = landmarks[23];
  
  const rightShoulder = landmarks[12];
  const rightElbow = landmarks[14];
  const rightWrist = landmarks[16];
  const rightHip = landmarks[24];

  // Require all core landmarks for both arms
  if (!leftShoulder || !leftElbow || !leftWrist || !leftHip ||
      !rightShoulder || !rightElbow || !rightWrist || !rightHip) return;

  // Check visibility for both arms
  const visCore = [leftShoulder, leftElbow, leftWrist, leftHip,
                    rightShoulder, rightElbow, rightWrist, rightHip].every(
    p => p && (p.visibility == null || p.visibility >= 0.5)
  );
  if (!visCore) return;

  // Calculate angles for LEFT arm
  const leftElbowAngleRaw = this.calculateAngle(leftWrist, leftElbow, leftShoulder);
  const leftShoulderAngleRaw = this.calculateAngle(leftElbow, leftShoulder, leftHip);
  
  // Calculate angles for RIGHT arm
  const rightElbowAngleRaw = this.calculateAngle(rightWrist, rightElbow, rightShoulder);
  const rightShoulderAngleRaw = this.calculateAngle(rightElbow, rightShoulder, rightHip);

  // Smooth angles for both arms
  const leftElbowAngle = this.smooth('press.leftElbow', leftElbowAngleRaw, 0.4);
  const leftShoulderAngle = this.smooth('press.leftShoulder', leftShoulderAngleRaw, 0.4);
  const rightElbowAngle = this.smooth('press.rightElbow', rightElbowAngleRaw, 0.4);
  const rightShoulderAngle = this.smooth('press.rightShoulder', rightShoulderAngleRaw, 0.4);

  // STATE DETECTION (BILATERAL) 
  // Both arms must meet criteria for each state
  let newStage = 'transition'; // Default fallback

  // 1. GROUND: Hands down, no errors
  const leftIsGround = leftShoulderAngle < 50;
  const rightIsGround = rightShoulderAngle < 50;
  
  // 2. RACK: 90-90 starting position (widened thresholds to tolerate natural asymmetry)
  const leftIsRack = (leftElbowAngle >= 60 && leftElbowAngle <= 125) &&
                     (leftShoulderAngle >= 60 && leftShoulderAngle <= 125);
  const rightIsRack = (rightElbowAngle >= 60 && rightElbowAngle <= 125) &&
                      (rightShoulderAngle >= 60 && rightShoulderAngle <= 125);
  
  // 3. LOCKOUT: Arms fully extended overhead
  const leftIsLockout = leftElbowAngle > 165 && leftShoulderAngle > 165;
  const rightIsLockout = rightElbowAngle > 165 && rightShoulderAngle > 165;

  // Determine stage - both arms must be in same state
  if (leftIsGround && rightIsGround) {
    newStage = 'ground';
  } else if (leftIsRack && rightIsRack) {
    newStage = 'rack';
  } else if (leftIsLockout && rightIsLockout) {
    newStage = 'lockout';
  } else {
    newStage = 'transition'; // Between states
  }

  // Check if state is stable
  if (!this.updateStability('overheadPress', newStage)) return;

  const state = this.frameCounts.overheadPress;

  // REP COUNTING
  // State machine: rack → lockout → rack = 1 rep
  if (this.repState.overheadPress === 'ground' || this.repState.overheadPress === 'start') {
    // User moves to rack position - ready to start rep
    if (newStage === 'rack') {
      this.repState.overheadPress = 'rack';
    }
  } else if (this.repState.overheadPress === 'rack') {
    // User presses to lockout
    if (newStage === 'lockout') {
      this.repState.overheadPress = 'lockout';
      // Progressive feedback at lockout
      if (!this.midwayFlags.overheadPress && this.canGiveFeedback('encourage')) {
        this.addFeedback('Good lockout! 🔥', 'info');
        if (this.sound) this.sound.midwayMaybePlay('overheadPress');
        this.markFeedbackGiven('encourage');
        this.midwayFlags.overheadPress = true;
      }
    }
  } else if (this.repState.overheadPress === 'lockout') {
    // User returns to rack - REP COMPLETE
    if (newStage === 'rack') {
      state.count++;
      this.addFeedback(`Rep ${state.count} complete! 🏋️`, 'success');
      if (this.sound) this.sound.markRep('overheadPress', state.count);
      this.markFeedbackGiven('rep');
      this.repState.overheadPress = 'rack';
      this.midwayFlags.overheadPress = false;
      
      // Play encouragement every 5 reps
      if (state.count % 5 === 0 && this.canGiveFeedback('encourage')) {
        this.addFeedback('Keep it up! 💪', 'info');
        this.markFeedbackGiven('encourage');
      }
    } else if (newStage === 'ground') {
      // User rested arms - reset to ground
      this.repState.overheadPress = 'ground';
      this.midwayFlags.overheadPress = false;
    }
  }

  // Only check form errors when in transition state (not at ground or lockout)
  // This ensures no errors at ground phase (rule 1) and only checks when approaching rack
  if (newStage === 'transition') {
    // Only check if trying to reach rack position (shoulders elevated from ground)
    const isTryingRack = (leftShoulderAngle > 55 && leftShoulderAngle < 130) ||
                         (rightShoulderAngle > 55 && rightShoulderAngle < 130);
    
    if (isTryingRack) {
      // Check for narrow elbows - use average to prevent false positives from asymmetry
      const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;
      const hasNarrowElbows = avgElbowAngle < 55;
      
      if (hasNarrowElbows && this.canGiveFeedback('form')) {
        this.addFeedback('Elbows are too narrow. 📐', 'error');
        if (this.sound) this.sound.play('overhead-press.form1', 'overheadPress', { formError: true });
        this.markFeedbackGiven('form');
      }
      
      // Check for wide elbows - use average to prevent false positives from asymmetry
      const hasWideElbows = avgElbowAngle > 130;
      
      if (hasWideElbows && this.canGiveFeedback('form')) {
        this.addFeedback('Elbows are too wide. 📐', 'error');
        if (this.sound) this.sound.play('overhead-press.form2', 'overheadPress', { formError: true });
        this.markFeedbackGiven('form');
      }
      
      // Clear form errors when angles are correct
      if (!hasNarrowElbows && !hasWideElbows) {
        if (this.sound) {
          this.sound.clearFormError('overhead-press.form1', 'overheadPress');
          this.sound.clearFormError('overhead-press.form2', 'overheadPress');
        }
      }
    } else {
      // Clear errors if not trying to reach rack
      if (this.sound) {
        this.sound.clearFormError('overhead-press.form1', 'overheadPress');
        this.sound.clearFormError('overhead-press.form2', 'overheadPress');
      }
    }
  } else {
    // Clear form errors when at ground, rack, or lockout positions
    if (this.sound) {
      this.sound.clearFormError('overhead-press.form1', 'overheadPress');
      this.sound.clearFormError('overhead-press.form2', 'overheadPress');
    }
  }
}

  // detect lateral raise
  detectLateralRaise(landmarks) {
    // Get both arms' landmarks
    const leftShoulder = landmarks[11];
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    const leftHip = landmarks[23];
    
    const rightShoulder = landmarks[12];
    const rightElbow = landmarks[14];
    const rightWrist = landmarks[16];
    const rightHip = landmarks[24];

    // Require all core landmarks for both arms
    if (!leftShoulder || !leftElbow || !leftWrist || !leftHip ||
        !rightShoulder || !rightElbow || !rightWrist || !rightHip) return;

    // Check visibility for both arms
    const visCore = [leftShoulder, leftElbow, leftWrist, leftHip,
                      rightShoulder, rightElbow, rightWrist, rightHip].every(
      p => p && (p.visibility == null || p.visibility >= 0.5)
    );
    if (!visCore) return;

    // Calculate angles for LEFT arm
    const leftShoulderAngleRaw = this.calculateAngle(leftHip, leftShoulder, leftWrist);  // Shoulder abduction
    const leftElbowAngleRaw = this.calculateAngle(leftShoulder, leftElbow, leftWrist);  // Elbow flexion
    
    // Calculate angles for RIGHT arm
    const rightShoulderAngleRaw = this.calculateAngle(rightHip, rightShoulder, rightWrist);  // Shoulder abduction
    const rightElbowAngleRaw = this.calculateAngle(rightShoulder, rightElbow, rightWrist);  // Elbow flexion

    // Smooth angles for both arms
    const leftShoulderAngle = this.smooth('lateralRaise.leftShoulder', leftShoulderAngleRaw, 0.4);
    const leftElbowAngle = this.smooth('lateralRaise.leftElbow', leftElbowAngleRaw, 0.4);
    const rightShoulderAngle = this.smooth('lateralRaise.rightShoulder', rightShoulderAngleRaw, 0.4);
    const rightElbowAngle = this.smooth('lateralRaise.rightElbow', rightElbowAngleRaw, 0.4);

    // Use average shoulder angle to determine stage (more robust than single side)
    const avgShoulderAngle = (leftShoulderAngle + rightShoulderAngle) / 2;
    
    let newStage;
    
    // determine stage from shoulder angle
    if (avgShoulderAngle < 30) {
      newStage = 'down';         // Arms at sides
    } else if (avgShoulderAngle < 60) {
      newStage = 'raising';      // Raising arms
    } else if (avgShoulderAngle < 75) {
      newStage = 'mid-range';    // Mid-way up
    } else {
      newStage = 'raised';       // Arms parallel to ground
    }

    // Check if state is stable
    if (!this.updateStability('lateralRaise', newStage)) return;

    const state = this.frameCounts.lateralRaise;

    // count reps when reaching raised position and returning to down
    if (this.repState.lateralRaise === 'down') {
      // mark raised when arms reach parallel position
      if (newStage === 'raised') {
        this.repState.lateralRaise = 'raised';
      }
    } else if (this.repState.lateralRaise === 'raised') {
      // count rep when returning to down
      if (newStage === 'down') {
        state.count++;
        if (this.sound) this.sound.markRep('lateralRaise', state.count);
        this.addFeedback(`Rep ${state.count} complete! 🏋️`, 'success');
        this.markFeedbackGiven('rep');
        this.repState.lateralRaise = 'down';
        // Reset midway flag when rep completes and user returns to start
        this.midwayFlags.lateralRaise = false;
        // Play encouragement every 5 reps
        if (state.count % 5 === 0 && this.canGiveFeedback('encourage')) {
          this.addFeedback('Keep it up! 💪', 'info');
          this.markFeedbackGiven('encourage');
        }
      }
    }
    
    // send progressive feedback during raise (ONCE per rep at midway point)
    if ((newStage === 'mid-range' || newStage === 'raised') && !this.midwayFlags.lateralRaise && this.canGiveFeedback('encourage')) {
      this.addFeedback('Almost there! 🔥', 'info');
      if (this.sound) this.sound.midwayMaybePlay('lateralRaise');
      this.markFeedbackGiven('encourage');
      this.midwayFlags.lateralRaise = true; // Set flag to prevent repeated midway sounds
    }

    // form corrections: check for bent elbows and arms raised too high
    // Use average elbow angle to prevent false positives from natural asymmetry
    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;
    
    // Form checks only in raised position with sufficient shoulder elevation
    if (newStage === 'raised' && avgShoulderAngle >= 70) {
      // Check 1: Arms raised too high (above shoulder level)
      // Target range is 80-95° (shoulder level), allow up to 110° for natural variation
      const raisedTooHigh = avgShoulderAngle > 150;
      const tooHighStable = this.isFormErrorStable('lateralRaise.tooHigh', raisedTooHigh);
      if (tooHighStable && this.canGiveFeedback('form')) {
        this.addFeedback('Don\'t raise arms above shoulder level! 📐', 'error');
        if (this.sound) this.sound.play('lateral-raise.form1', 'lateralRaise', { formError: true });
        this.markFeedbackGiven('form');
      } else if (!raisedTooHigh) {
        if (this.sound) this.sound.clearFormError('lateral-raise.form1', 'lateralRaise');
      }

      // Check 2: Bent elbows (more lenient threshold and higher stability)
      const hasBentElbows = avgElbowAngle < 140;
      const bentElbowsStable = this.isFormErrorStable('lateralRaise.bentElbows', hasBentElbows);
      // Require 8 consecutive frames instead of 5 to reduce noise
      if (bentElbowsStable && this.formErrorFrames['lateralRaise.bentElbows'] >= 8 && this.canGiveFeedback('form')) {
        this.addFeedback('Keep your elbows straight! 📐', 'error');
        if (this.sound) this.sound.play('lateral-raise.form2', 'lateralRaise', { formError: true });
        this.markFeedbackGiven('form');
      } else if (!hasBentElbows) {
        if (this.sound) this.sound.clearFormError('lateral-raise.form2', 'lateralRaise');
      }
    } else {
      // Clear all form errors when not in checked range
      if (this.sound) {
        this.sound.clearFormError('lateral-raise.form1', 'lateralRaise');
        this.sound.clearFormError('lateral-raise.form2', 'lateralRaise');
      }
      // Reset error counters when not checking
      this.formErrorFrames['lateralRaise.tooHigh'] = 0;
      this.formErrorFrames['lateralRaise.bentElbows'] = 0;
    }
  }

  // detect crunch
  detectCrunch(landmarks) {
    // Get landmarks for both sides
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const nose = landmarks[0]; // Use nose for head position

    // Visibility gate - core landmarks must be visible
    const vis = (p, thr = 0.5) => (p && (p.visibility == null || p.visibility >= thr));
    if (!(vis(leftShoulder) && vis(rightShoulder) && vis(leftHip) && vis(rightHip))) return;

    // Calculate midpoints for robust angle calculation
    const midShoulder = (leftShoulder && rightShoulder) ? { 
      x: (leftShoulder.x + rightShoulder.x) / 2, 
      y: (leftShoulder.y + rightShoulder.y) / 2 
    } : (leftShoulder || rightShoulder);
    const midHip = (leftHip && rightHip) ? { 
      x: (leftHip.x + rightHip.x) / 2, 
      y: (leftHip.y + rightHip.y) / 2 
    } : (leftHip || rightHip);

    if (!midShoulder || !midHip) return;

    // KEY ANGLE 1: Torso Angle (lift of torso relative to floor)
    // 0° = flat on floor, increases as torso lifts
    const torsoAngleToFloorRaw = this.calculateTorsoAngleToFloor(midShoulder, midHip);
    const torsoAngle = this.smooth('crunch.torsoToFloor', torsoAngleToFloorRaw, 0.4);

    // KEY ANGLE 2: Knee Angle (bend in the knee)
    const leftLegOk = vis(leftKnee) && vis(leftAnkle);
    const rightLegOk = vis(rightKnee) && vis(rightAnkle);
    let kneeAngleRaw = null;
    if (leftLegOk && leftHip) {
      kneeAngleRaw = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    } else if (rightLegOk && rightHip) {
      kneeAngleRaw = this.calculateAngle(rightHip, rightKnee, rightAnkle);
    }
    const kneeAngle = kneeAngleRaw != null ? this.smooth('crunch.knee', kneeAngleRaw, 0.4) : null;

    // KEY ANGLE 3: Neck Alignment Angle (angle at shoulder between head and hip line)
    // Use nose for head position, or fallback to ear if nose not visible
    let headPoint = nose;
    if (!headPoint || !vis(headPoint)) {
      // Try using average of ears if nose not available
      const leftEar = landmarks[7];
      const rightEar = landmarks[8];
      if (leftEar && rightEar) {
        headPoint = { 
          x: (leftEar.x + rightEar.x) / 2, 
          y: (leftEar.y + rightEar.y) / 2 
        };
      } else {
        headPoint = leftEar || rightEar;
      }
    }

    let neckAlignmentAngleRaw = null;
    if (headPoint && midShoulder && midHip) {
      neckAlignmentAngleRaw = this.calculateNeckAlignmentAngle(headPoint, midShoulder, midHip);
    }
    const neckAlignmentAngle = neckAlignmentAngleRaw != null 
      ? this.smooth('crunch.neckAlignment', neckAlignmentAngleRaw, 0.4) 
      : null;

    // POSE STATE LOGIC: Determine state based on Torso Angle
    // STARTING: Torso Angle ≤ 5°
    // CRUNCHING: Torso Angle > 5°
    let newStage;
    if (torsoAngle <= 5) {
      newStage = 'start'; // STARTING state
    } else {
      newStage = 'crunching'; // CRUNCHING state
    }

    if (!this.updateStability('crunch', newStage)) return;
    const state = this.frameCounts.crunch;

    // REP COUNTING: start -> crunching -> start
    if (this.repState.crunch === 'start') {
      if (newStage === 'crunching') {
        this.repState.crunch = 'crunching';
      }
    } else if (this.repState.crunch === 'crunching') {
      if (newStage === 'start') {
        state.count++;
        this.addFeedback(`Rep ${state.count} complete! 🏋️`, 'success');
        if (this.sound) this.sound.markRep('crunch', state.count);
        this.markFeedbackGiven('rep');
        this.repState.crunch = 'start';
        this.midwayFlags.crunch = false;
        // Play encouragement every 5 reps
        if (state.count % 5 === 0 && this.canGiveFeedback('encourage')) {
          this.addFeedback('Keep it up! 💪', 'info');
          this.markFeedbackGiven('encourage');
        }
      }
    }

    // Progressive cues (ONCE per rep at midway point)
    if (newStage === 'crunching' && !this.midwayFlags.crunch && this.canGiveFeedback('encourage')) {
      this.addFeedback('Crunch up! 🔥', 'info');
      if (this.sound) this.sound.midwayMaybePlay('crunch');
      this.markFeedbackGiven('encourage');
      this.midwayFlags.crunch = true;
    }

    // FEEDBACK RULES - Check in both states
    // Rule 1: Neck Alignment Angle (Safety) - Detect neck strain
    if (neckAlignmentAngle != null) {
      // Bad: < 130° indicates pulling head forward (neck strain)
      // Good: >= 130° indicates relaxed, neutral neck
      const neckStrained = neckAlignmentAngle < 130;
      const neckStrainStable = this.isFormErrorStable('crunch.neckStrain', neckStrained);
      if (neckStrainStable && this.canGiveFeedback('form')) {
        this.addFeedback('Don\'t pull your head forward. Relax your neck.', 'error');
        if (this.sound) this.sound.play('crunch.form1', 'crunch', { formError: true });
        this.markFeedbackGiven('form');
      } else if (!neckStrained) {
        if (this.sound) this.sound.clearFormError('crunch.form1', 'crunch');
      }
    }

    // Rule 2: Lower Back Position - Check in BOTH states (placeholder)
    // TODO: Implement actual hip lift detection logic if feasible
    const hipShouldNotLift = true; // Placeholder - always passing for now
    if (!hipShouldNotLift && this.canGiveFeedback('form')) {
      this.addFeedback('Keep lower back down.', 'error');
      if (this.sound) this.sound.play('crunch.form2', 'crunch', { formError: true });
      this.markFeedbackGiven('form');
    } else if (hipShouldNotLift) {
      if (this.sound) this.sound.clearFormError('crunch.form2', 'crunch');
    }

    // FEEDBACK RULES - Specific to the CRUNCHING state
    if (newStage === 'crunching') {
      // Rule 3: Torso Angle - Range of Motion (Shallow)
      // Minimum Pass: Must be ≥ 10°
      const shallowRange = torsoAngle < 10;
      const shallowRangeStable = this.isFormErrorStable('crunch.shallow', shallowRange);
      if (shallowRangeStable && this.canGiveFeedback('form')) {
        this.addFeedback('Lift higher for a full contraction.', 'error');
        if (this.sound) this.sound.play('crunch.form3', 'crunch', { formError: true });
        this.markFeedbackGiven('form');
      } else if (torsoAngle >= 10 && torsoAngle <= 40) {
        if (this.sound) this.sound.clearFormError('crunch.form3', 'crunch');
      }

      // Rule 4: Torso Angle - Range of Motion (Too High - Full Sit-Up)
      // Maximum Pass: Must be ≤ 40°
      const tooHigh = torsoAngle > 40;
      const tooHighStable = this.isFormErrorStable('crunch.tooHigh', tooHigh);
      if (tooHighStable && this.canGiveFeedback('form')) {
        this.addFeedback('Don\'t sit all the way up! Keep it as a crunch.', 'error');
        if (this.sound) this.sound.play('crunch.form4', 'crunch', { formError: true });
        this.markFeedbackGiven('form');
      } else if (torsoAngle <= 40) {
        if (this.sound) this.sound.clearFormError('crunch.form4', 'crunch');
      }
    } else {
      // Clear form errors when not in crunching state
      if (this.sound) {
        this.sound.clearFormError('crunch.form3', 'crunch');
        this.sound.clearFormError('crunch.form4', 'crunch');
      }
    }
  }
}
