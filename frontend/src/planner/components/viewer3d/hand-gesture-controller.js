'use strict';

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';
const MODEL_ASSET_PATH = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const DEFAULT_OPTIONS = {
  numHands: 1,
  minHandDetectionConfidence: 0.6,
  minHandPresenceConfidence: 0.6,
  minTrackingConfidence: 0.6,
  pinchThreshold: 0.075,
  releaseThreshold: 0.1,
  smoothing: 0.35,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mix(current, next, factor) {
  return current + (next - current) * factor;
}

export default class HandGestureController {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.video = null;
    this.stream = null;
    this.handLandmarker = null;
    this.lastVideoTime = -1;
    this.lastTimestamp = 0;

    this.enabled = false;
    this.ready = false;
    this.pinchActive = false;
    this.smoothedPinchDistance = null;
    this.previousPinchDistance = null;

    this.onStatusChange = options.onStatusChange || null;
  }

  async start() {
    if (this.ready) {
      this.enabled = true;
      this._emitStatus();
      return;
    }

    let stream = null;
    let video = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      video = document.createElement('video');
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      video.srcObject = stream;

      await video.play();

      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_PATH,
        },
        runningMode: 'VIDEO',
        numHands: this.options.numHands,
        minHandDetectionConfidence: this.options.minHandDetectionConfidence,
        minHandPresenceConfidence: this.options.minHandPresenceConfidence,
        minTrackingConfidence: this.options.minTrackingConfidence,
      });

      this.stream = stream;
      this.video = video;
      this.handLandmarker = handLandmarker;
      this.enabled = true;
      this.ready = true;
      this.lastVideoTime = -1;
      this.lastTimestamp = 0;
      this.pinchActive = false;
      this.smoothedPinchDistance = null;
      this.previousPinchDistance = null;
      this._emitStatus();
    } catch (error) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      this.enabled = false;
      this.ready = false;
      this._emitStatus(error);
      throw error;
    }
  }

  stop() {
    this.enabled = false;
    this.pinchActive = false;
    this.smoothedPinchDistance = null;
    this.previousPinchDistance = null;
    this._emitStatus();
  }

  dispose() {
    this.stop();

    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }

    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video.remove();
      this.video = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  getVideoElement() {
    return this.video;
  }

  update(now = performance.now()) {
    if (!this.enabled || !this.ready || !this.video || !this.handLandmarker) {
      return null;
    }

    if (this.video.readyState < 2) {
      return null;
    }

    if (this.video.currentTime === this.lastVideoTime) {
      return null;
    }

    this.lastVideoTime = this.video.currentTime;

    const result = this.handLandmarker.detectForVideo(this.video, now);
    const handLandmarks = result?.landmarks?.[0] || result?.handLandmarks?.[0];
    const handedness = result?.handedness?.[0]?.[0]?.categoryName || 'Unknown';

    if (!handLandmarks || handLandmarks.length < 9) {
      this.pinchActive = false;
      this.smoothedPinchDistance = null;
      this.previousPinchDistance = null;
      this.lastTimestamp = now;
      return {
        detected: false,
        pinchActive: false,
        zoomDelta: 0,
        handedness,
      };
    }

    const thumbTip = handLandmarks[4];
    const indexTip = handLandmarks[8];
    const wrist = handLandmarks[0];
    const middleKnuckle = handLandmarks[9];

    const pinchDistance = Math.hypot(
      thumbTip.x - indexTip.x,
      thumbTip.y - indexTip.y
    );

    const palmSize = Math.hypot(
      wrist.x - middleKnuckle.x,
      wrist.y - middleKnuckle.y
    ) || 0.001;

    const normalizedPinchDistance = pinchDistance / palmSize;
    const smoothing = clamp(this.options.smoothing, 0.01, 0.95);

    if (this.smoothedPinchDistance == null) {
      this.smoothedPinchDistance = normalizedPinchDistance;
    } else {
      this.smoothedPinchDistance = mix(
        this.smoothedPinchDistance,
        normalizedPinchDistance,
        smoothing
      );
    }

    const pinchThreshold = this.options.pinchThreshold;
    const releaseThreshold = this.options.releaseThreshold;
    const wasPinching = this.pinchActive;

    if (!this.pinchActive && this.smoothedPinchDistance <= pinchThreshold) {
      this.pinchActive = true;
    } else if (this.pinchActive && this.smoothedPinchDistance >= releaseThreshold) {
      this.pinchActive = false;
    }

    let zoomDelta = 0;
    if (wasPinching && this.pinchActive && this.lastTimestamp) {
      zoomDelta = this.smoothedPinchDistance - (this.previousPinchDistance ?? this.smoothedPinchDistance);
    }

    this.previousPinchDistance = this.smoothedPinchDistance;
    this.lastTimestamp = now;

    return {
      detected: true,
      pinchActive: this.pinchActive,
      pinchDistance: this.smoothedPinchDistance,
      zoomDelta,
      handedness,
    };
  }

  _emitStatus(error = null) {
    if (!this.onStatusChange) return;

    this.onStatusChange({
      enabled: this.enabled,
      ready: this.ready,
      error: error ? error.message || String(error) : null,
    });
  }
}
