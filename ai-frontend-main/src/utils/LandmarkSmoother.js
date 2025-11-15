// Exponential Moving Average (EMA) smoother for pose landmarks
// Reduces jitter by smoothing x, y, z coordinates over time

export class LandmarkSmoother {
  constructor(alpha = 0.3) {
    this.alpha = alpha; // Smoothing factor (0-1, lower = smoother)
    this.smoothedLandmarks = null;
    this.isInitialized = false;
  }

  // Smooth landmark positions using EMA
  smooth(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      this.isInitialized = false;
      return landmarks;
    }

    // Initialize smoothed landmarks on first frame
    if (!this.isInitialized || !this.smoothedLandmarks) {
      this.smoothedLandmarks = landmarks.map(landmark => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z || 0,
        visibility: landmark.visibility,
        presence: landmark.presence
      }));
      this.isInitialized = true;
      return this.smoothedLandmarks;
    }

    // Apply EMA smoothing to each landmark
    this.smoothedLandmarks = landmarks.map((landmark, index) => {
      const prev = this.smoothedLandmarks[index];
      if (!prev) {
        return {
          x: landmark.x,
          y: landmark.y,
          z: landmark.z || 0,
          visibility: landmark.visibility,
          presence: landmark.presence
        };
      }

      return {
        x: this.alpha * landmark.x + (1 - this.alpha) * prev.x,
        y: this.alpha * landmark.y + (1 - this.alpha) * prev.y,
        z: this.alpha * (landmark.z || 0) + (1 - this.alpha) * prev.z,
        visibility: landmark.visibility,
        presence: landmark.presence
      };
    });

    return this.smoothedLandmarks;
  }

  // Reset smoother state (call when pose is lost)
  reset() {
    this.smoothedLandmarks = null;
    this.isInitialized = false;
  }

  // Update smoothing factor
  setAlpha(alpha) {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }
}
