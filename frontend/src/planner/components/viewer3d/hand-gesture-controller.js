'use strict';

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';
const MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const DEFAULT_OPTIONS = {
  numHands: 1,
  minHandDetectionConfidence: 0.22,
  minHandPresenceConfidence: 0.22,
  minTrackingConfidence: 0.22,
  pinchThreshold: 0.22,
  releaseThreshold: 0.34,
  pinchSmoothing: 0.26,
  scaleSmoothing: 0.24,
  centerSmoothing: 0.34,
  rotateActivationDelayMs: 55,
  trackingGraceMs: 420,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mix(current, next, factor) {
  return current + (next - current) * factor;
}

function averagePoints(points) {
  const totals = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: totals.x / points.length,
    y: totals.y / points.length,
  };
}

function distanceBetweenPoints(pointA, pointB) {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

function getHandMetrics(handLandmarks) {
  const thumbTip = handLandmarks[4];
  const indexTip = handLandmarks[8];
  const wrist = handLandmarks[0];
  const indexBase = handLandmarks[5];
  const middleKnuckle = handLandmarks[9];
  const pinkyBase = handLandmarks[17];

  const pinchDistance = distanceBetweenPoints(thumbTip, indexTip);
  const palmHeight = distanceBetweenPoints(wrist, middleKnuckle);
  const palmWidth = distanceBetweenPoints(indexBase, pinkyBase);
  const handScale = Math.max((palmHeight + palmWidth) / 2, 0.001);
  const normalizedPinchDistance = pinchDistance / handScale;
  const palmCenter = averagePoints([wrist, indexBase, middleKnuckle, pinkyBase]);
  const pinchMidpoint = averagePoints([thumbTip, indexTip]);

  return {
    pinchDistance,
    handScale,
    normalizedPinchDistance,
    palmCenter,
    handCenter: {
      x: pinchMidpoint.x * 0.78 + palmCenter.x * 0.22,
      y: pinchMidpoint.y * 0.78 + palmCenter.y * 0.22,
    },
  };
}

export default class HandGestureController {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.video = null;
    this.stream = null;
    this.handLandmarker = null;
    this.lastVideoTime = -1;
    this.lastFrame = null;

    this.enabled = false;
    this.ready = false;
    this.pinchActive = false;
    this.pinchStartedAt = 0;
    this.gestureSessionId = 0;
    this.smoothedPinchDistance = null;
    this.smoothedHandScale = null;
    this.smoothedCenter = null;
    this.lastDetectedAt = 0;
    this.lastHandedness = 'Unknown';
    this.activeMode = 'idle';
    this.activeHandedness = null;

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
      this.lastFrame = null;
      this._resetTrackingState();
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
    this._resetTrackingState();
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
      return this.lastFrame;
    }

    if (this.video.readyState < 2) {
      return this.lastFrame;
    }

    if (this.video.currentTime === this.lastVideoTime) {
      return this.lastFrame;
    }

    this.lastVideoTime = this.video.currentTime;

    const result = this.handLandmarker.detectForVideo(this.video, now);
    const allHandLandmarks = result?.landmarks || result?.handLandmarks || [];
    const handednessList = result?.handedness || [];

    const detectedHands = allHandLandmarks
      .map((handLandmarks, index) => {
        if (!handLandmarks || handLandmarks.length < 18) return null;

        return {
          ...getHandMetrics(handLandmarks),
          handedness:
            handednessList?.[index]?.[0]?.categoryName || this.lastHandedness,
        };
      })
      .filter(Boolean)
      .sort((leftHand, rightHand) => leftHand.handCenter.x - rightHand.handCenter.x);

    if (detectedHands.length === 0) {
      const recentlyDetected =
        this.lastDetectedAt > 0 &&
        now - this.lastDetectedAt <= this.options.trackingGraceMs &&
        this.lastFrame?.detected;

      if (recentlyDetected) {
        const holdMs =
          this.activeMode === 'single-hand-rotate' && this.pinchStartedAt
            ? now - this.pinchStartedAt
            : 0;

        this.lastFrame = {
          ...this.lastFrame,
          trackingHeld: true,
          holdMs,
          rotationActive:
            this.activeMode === 'single-hand-rotate' &&
            holdMs >= this.options.rotateActivationDelayMs,
        };
        return this.lastFrame;
      }

      this._resetTrackingState();
      return this.lastFrame;
    }

    this.lastDetectedAt = now;
    this.lastHandedness = detectedHands.map((hand) => hand.handedness).join('+');
    const primaryHand =
      detectedHands.find(
        (hand) =>
          this.activeHandedness && hand.handedness === this.activeHandedness,
      ) ||
      detectedHands.find(
        (hand) => hand.normalizedPinchDistance <= this.options.releaseThreshold,
      ) ||
      detectedHands[0];
    const pinchSmoothing = clamp(this.options.pinchSmoothing, 0.01, 0.95);
    const scaleSmoothing = clamp(this.options.scaleSmoothing, 0.01, 0.95);
    const centerSmoothing = clamp(this.options.centerSmoothing, 0.01, 0.95);

    if (this.smoothedPinchDistance == null) {
      this.smoothedPinchDistance = primaryHand.normalizedPinchDistance;
    } else {
      this.smoothedPinchDistance = mix(
        this.smoothedPinchDistance,
        primaryHand.normalizedPinchDistance,
        pinchSmoothing,
      );
    }

    if (!this.smoothedCenter) {
      this.smoothedCenter = { ...primaryHand.handCenter };
    } else {
      this.smoothedCenter = {
        x: mix(this.smoothedCenter.x, primaryHand.handCenter.x, centerSmoothing),
        y: mix(this.smoothedCenter.y, primaryHand.handCenter.y, centerSmoothing),
      };
    }

    if (this.smoothedHandScale == null) {
      this.smoothedHandScale = primaryHand.handScale;
    } else {
      this.smoothedHandScale = mix(
        this.smoothedHandScale,
        primaryHand.handScale,
        scaleSmoothing,
      );
    }

    if (
      !this.pinchActive &&
      this.smoothedPinchDistance <= this.options.pinchThreshold
    ) {
      this.pinchActive = true;
      this.pinchStartedAt = now;
      this.activeMode = 'single-hand-rotate';
      this.activeHandedness = primaryHand.handedness;
      this.gestureSessionId += 1;
    } else if (
      this.pinchActive &&
      this.smoothedPinchDistance >= this.options.releaseThreshold
    ) {
      this.pinchActive = false;
      this.pinchStartedAt = 0;
      this.activeMode = 'single-hand-idle';
      this.activeHandedness = null;
    }

    const holdMs = this.pinchActive ? now - this.pinchStartedAt : 0;
    const rotationActive =
      this.pinchActive && holdMs >= this.options.rotateActivationDelayMs;

    if (!this.pinchActive && this.activeMode !== 'single-hand-idle') {
      this.activeMode = 'single-hand-idle';
    }

    this.lastFrame = {
      detected: true,
      trackingHeld: false,
      pinchActive: this.pinchActive,
      rotationActive,
      twoHandZoomActive: false,
      twoHandHoldActive: false,
      pinchDistance: this.smoothedPinchDistance,
      handScale: this.smoothedHandScale,
      zoomDistance: 0,
      handCenter: this.smoothedCenter ? { ...this.smoothedCenter } : null,
      sessionId: this.gestureSessionId,
      holdMs,
      handedness: primaryHand.handedness,
      handsDetected: 1,
    };
    return this.lastFrame;
  }

  _resetTrackingState() {
    this.pinchActive = false;
    this.pinchStartedAt = 0;
    this.smoothedPinchDistance = null;
    this.smoothedHandScale = null;
    this.smoothedCenter = null;
    this.lastDetectedAt = 0;
    this.activeMode = 'idle';
    this.activeHandedness = null;
    this.lastFrame = {
      detected: false,
      trackingHeld: false,
      pinchActive: false,
      rotationActive: false,
      twoHandZoomActive: false,
      twoHandHoldActive: false,
      pinchDistance: 0,
      handScale: 0,
      zoomDistance: 0,
      handCenter: null,
      sessionId: this.gestureSessionId,
      holdMs: 0,
      handedness: this.lastHandedness,
      handsDetected: 0,
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
