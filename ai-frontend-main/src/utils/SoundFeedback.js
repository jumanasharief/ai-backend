// Centralized sound manager for exercise audio feedback
// - Preloads audio assets
// - Queues playback to avoid overlap
// - Enforces play-once per rep for form/midway cues
// - Exposes reset methods per rep/exercise/session

export default class SoundFeedback {
  constructor() {
    // Audio queue and state
    this.audioQueue = [];
    this.isPlaying = false;

    // Tracking maps
    this.sessionPlayed = new Set(); // session-level one-off keys if needed
    this.exerciseRepPlayed = new Map(); // Map<exercise, Set<key>> for per-rep play-once
    this.exerciseSessionPlayed = new Map(); // Map<exercise, Set<key>> for per-exercise session-level once

    // Midway dwell timers per exercise
    this.midwayState = new Map(); // Map<exercise, { startedAt: number, timeoutId: any, playedThisRep: boolean }>

    // Active form errors per exercise to avoid spamming while an error persists
    this.activeFormErrors = new Map(); // Map<exercise, Set<soundKey>>

    // Preload sounds immediately
    this.sounds = this.preload();
  }

  // Build Audio objects for each key. Use import.meta.url to ensure bundler resolves assets
  preload() {
    const make = (rel) => {
      try {
        const url = new URL(`../sounds/${rel}`, import.meta.url);
        const a = new Audio(url);
        a.preload = 'auto';
        // Prime by loading metadata; ignore failures
        a.load?.();
        return a;
      } catch (e) {
        console.warn('Failed to preload sound:', rel, e);
        return null;
      }
    };

    return {
      // global
      starting: make('starting.mp3'),
      midway: make('midway.mp3'),
      encourage: make('encourage.mp3'),

      // exercise-specific
      'squat.form': make('squat.form.mp3'),
      'bicep-curl.form': make('bicep-curl.form.mp3'),
      'front-kick.form': make('front-kick.form.mp3'),
      'overhead-press.form1': make('overhead-press.form1.mp3'),
      'overhead-press.form2': make('overhead-press.form2.mp3'),
      'lateral-raise.form1': make('lateral-raise.form1.mp3'),
      'lateral-raise.form2': make('lateral-raise.form2.mp3'),
      'crunch.form1': make('crunch.form1.mp3'),
      'crunch.form2': make('crunch.form2.mp3'),
      'crunch.form3': make('crunch.form3.mp3'),
      'crunch.form4': make('crunch.form4.mp3'),
    };
  }

  // Play a sound once for the entire current session lifetime
  playOnce(soundKey) {
    if (this.sessionPlayed.has(soundKey)) return Promise.resolve();
    this.sessionPlayed.add(soundKey);
    return this.play(soundKey);
  }

  // Queue-based play to avoid overlaps; supports form error suppression while active
  play(soundKey, exercise = null, { oncePerRep = false, oncePerExercise = false, formError = false } = {}) {
    const audio = this.sounds?.[soundKey];
    if (!audio) return Promise.resolve();

    // If this is a form error sound, suppress repeats while the error remains active
    if (formError && exercise) {
      const active = this._getActiveErrorSet(exercise);
      if (active.has(soundKey)) return Promise.resolve();
      active.add(soundKey);
    }

    // Enforce per-rep dedupe
    if (oncePerRep && exercise) {
      const repSet = this._getRepSet(exercise);
      if (repSet.has(soundKey)) return Promise.resolve();
      repSet.add(soundKey);
    }

    // Enforce per-exercise session dedupe (form cues could be repeated across reps if not requested)
    if (oncePerExercise && exercise) {
      const exSet = this._getExerciseSet(exercise);
      if (exSet.has(soundKey)) return Promise.resolve();
      exSet.add(soundKey);
    }

    return new Promise((resolve) => {
      this.audioQueue.push({ key: soundKey, audio, resolve });
      this._drainQueue();
    });
  }

  // Used by detector after rep increments to trigger encourage at multiples of 5
  markRep(exercise, repCount) {
    try {
      if (repCount > 0 && repCount % 5 === 0) {
        this.play('encourage');
      }
      // New rep started → clear per-rep flags and midway state
      this.resetRep(exercise);
    } catch (_) {
      // no-op
    }
  }

  // Called next to info encouragement texts; plays midway if dwell >= 4s and not yet played this rep
  midwayMaybePlay(exercise) {
    if (!exercise) return;
    const now = Date.now();
    const entry = this.midwayState.get(exercise) || { startedAt: now, timeoutId: null, playedThisRep: false };
    // If first call this rep, set timer
    if (!entry.timeoutId && !entry.playedThisRep) {
      entry.startedAt = now;
      entry.timeoutId = setTimeout(() => {
        // After 4s dwell, play once this rep
        const current = this.midwayState.get(exercise);
        if (current && !current.playedThisRep) {
          current.playedThisRep = true;
          this.play('midway', exercise, { oncePerRep: true });
        }
      }, 4000);
    }
    this.midwayState.set(exercise, entry);
  }

  resetRep(exercise) {
    if (!exercise) return;
    const set = this.exerciseRepPlayed.get(exercise);
    if (set) set.clear();
    const entry = this.midwayState.get(exercise);
    if (entry?.timeoutId) clearTimeout(entry.timeoutId);
    this.midwayState.set(exercise, { startedAt: 0, timeoutId: null, playedThisRep: false });
  }

  resetExercise(exercise) {
    if (!exercise) return;
    // Clear rep and per-exercise once flags
    this.exerciseRepPlayed.delete(exercise);
    this.exerciseSessionPlayed.delete(exercise);
    const entry = this.midwayState.get(exercise);
    if (entry?.timeoutId) clearTimeout(entry.timeoutId);
    this.midwayState.delete(exercise);
  }

  resetSession() {
    // Stop everything immediately
    this.stopAll();
    this.sessionPlayed.clear();
    this.exerciseRepPlayed.clear();
    this.exerciseSessionPlayed.clear();
    this.activeFormErrors.clear();
    // Clear all midway timers
    for (const [ex, entry] of this.midwayState.entries()) {
      if (entry?.timeoutId) clearTimeout(entry.timeoutId);
      this.midwayState.set(ex, { startedAt: 0, timeoutId: null, playedThisRep: false });
    }
  }

  // Helper: drain queue serially
  _drainQueue() {
    if (this.isPlaying) return;
    const next = this.audioQueue.shift();
    if (!next) return;
    this.isPlaying = true;
    try {
      const { audio, resolve } = next;
      // Create a fresh Audio instance to avoid ended-state issues
      const fresh = new Audio(audio.src);
      fresh.preload = 'auto';
      const done = () => {
        fresh.removeEventListener('ended', onEnd);
        fresh.removeEventListener('error', onEnd);
        this.isPlaying = false;
        resolve();
        // Continue queue
        this._drainQueue();
      };
      const onEnd = () => done();
      fresh.addEventListener('ended', onEnd);
      fresh.addEventListener('error', onEnd);
      // Non-blocking play with catch to swallow user-gesture requirements
      const p = fresh.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => onEnd());
      }
    } catch (e) {
      console.warn('Audio play failed:', e);
      this.isPlaying = false;
      this._drainQueue();
    }
  }

  _getRepSet(exercise) {
    let set = this.exerciseRepPlayed.get(exercise);
    if (!set) {
      set = new Set();
      this.exerciseRepPlayed.set(exercise, set);
    }
    return set;
    }

  _getExerciseSet(exercise) {
    let set = this.exerciseSessionPlayed.get(exercise);
    if (!set) {
      set = new Set();
      this.exerciseSessionPlayed.set(exercise, set);
    }
    return set;
  }

  _getActiveErrorSet(exercise) {
    let set = this.activeFormErrors.get(exercise);
    if (!set) {
      set = new Set();
      this.activeFormErrors.set(exercise, set);
    }
    return set;
  }

  clearFormError(soundKey, exercise) {
    const set = this.activeFormErrors.get(exercise);
    if (set) set.delete(soundKey);
  }

  // Immediately stop all audio and clear queues/timers
  stopAll() {
    try {
      // Stop current by toggling state and letting onEnd resolve
      this.audioQueue = [];
      this.isPlaying = false;
      // Attempt to pause any currently playing element by creating a silent element and not starting it
      // No persistent reference to current element exists; queue drained ensures nothing else plays.
    } catch (_) {}
    // Clear midway timers
    for (const [ex, entry] of this.midwayState.entries()) {
      if (entry?.timeoutId) clearTimeout(entry.timeoutId);
      this.midwayState.set(ex, { startedAt: 0, timeoutId: null, playedThisRep: false });
    }
  }
}


