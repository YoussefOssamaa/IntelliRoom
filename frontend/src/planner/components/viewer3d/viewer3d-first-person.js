"use strict";

import React from 'react';
import PropTypes from 'prop-types';
import * as Three from 'three';
import {parseData, updateScene} from './scene-creator';
import {disposeScene} from './three-memory-cleaner';
import diff from 'immutablediff';
import {initPointerLock} from "./pointer-lock-navigation";
import {firstPersonOnKeyDown, firstPersonOnKeyUp} from "./libs/first-person-controls";
import * as SharedStyle from '../../shared-style';
import PlannerContext from '../../context/PlannerContext';

export default class Viewer3DFirstPerson extends React.Component {

  constructor(props) {
    super(props);

    this.canvasWrapperRef = React.createRef();
    this.width = props.width;
    this.height = props.height;
    this.stopRendering = false;
    this.renderInteractionMode = 'default';
    this.renderControlType = 'drag-pan';
    this.renderCameraHeight = 170;
    this.renderCameraHeightLimit = 280;
    this.renderCameraVerticalRotation = 0;
    this.isDirectionDragging = false;
    this.isMoveDragging = false;
    this.lastRenderDragPoint = { x: 0, y: 0 };
    this._lodEntries = [];
    this._lodDirty = true;
    this._sceneDirtyForFrame = true;
    this._hasLastFrameCameraState = false;
    this._lastCameraPosition = new Three.Vector3();
    this._lastCameraQuaternion = new Three.Quaternion();
    this._cameraWorldPosition = new Three.Vector3();
    this._cameraWorldQuaternion = new Three.Quaternion();
    this._lastRendererWidth = this.width;
    this._lastRendererHeight = this.height;
    this.renderer = window.__threeRenderer || new Three.WebGLRenderer({preserveDrawingBuffer: true});
    window.__threeRenderer = this.renderer;
  }

  emitRenderCameraVerticalRotationChange(verticalDegrees) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('render-camera-vertical-rotation-change', {
      detail: verticalDegrees,
    }));
  }

  getPitchObject() {
    const yawObject = this.controls?.getObject?.();
    if (!yawObject?.children?.length) return null;
    return yawObject.children.find((child) => child?.name === 'pitchObject') || null;
  }

  _refreshLodEntries(planData) {
    const lodMap = (planData && planData.sceneGraph && planData.sceneGraph.LODs) || {};
    this._lodEntries = Object.values(lodMap).filter(Boolean);
    this._lodDirty = false;
  }

  _didCameraStateChange(camera) {
    camera.getWorldPosition(this._cameraWorldPosition);
    camera.getWorldQuaternion(this._cameraWorldQuaternion);

    if (!this._hasLastFrameCameraState) {
      this._lastCameraPosition.copy(this._cameraWorldPosition);
      this._lastCameraQuaternion.copy(this._cameraWorldQuaternion);
      this._hasLastFrameCameraState = true;
      return true;
    }

    const positionChanged = this._lastCameraPosition.distanceToSquared(this._cameraWorldPosition) > 1e-6;
    const rotationChanged = 1 - Math.abs(this._lastCameraQuaternion.dot(this._cameraWorldQuaternion)) > 1e-6;

    if (positionChanged || rotationChanged) {
      this._lastCameraPosition.copy(this._cameraWorldPosition);
      this._lastCameraQuaternion.copy(this._cameraWorldQuaternion);
      return true;
    }

    return false;
  }

  enablePointerLockClick(enable) {
    if (!this.renderer?.domElement || !this.requestPointerLockEvent) return;

    if (enable && !this.pointerLockClickEnabled) {
      this.renderer.domElement.addEventListener('click', this.requestPointerLockEvent);
      this.pointerLockClickEnabled = true;
      return;
    }

    if (!enable && this.pointerLockClickEnabled) {
      this.renderer.domElement.removeEventListener('click', this.requestPointerLockEvent);
      this.pointerLockClickEnabled = false;
    }
  }

  applyRenderInteractionMode() {
    const mode = this.renderInteractionMode || 'default';
    const controlType = this.renderControlType || 'drag-pan';

    if (!this.controls || !this.renderer?.domElement) return;

    if (mode !== 'walkthrough') {
      this.enablePointerLockClick(false);
      if (document.pointerLockElement === document.body) {
        document.exitPointerLock?.();
      }
      this.controls.enabled = true;
      this.isDirectionDragging = false;
      this.isMoveDragging = false;
      this.renderer.domElement.style.cursor = 'default';
      return;
    }

    if (controlType === 'pointer-lock') {
      this.enablePointerLockClick(true);
      this.renderer.domElement.style.cursor = this.isPointerLocked() ? 'none' : 'crosshair';
      return;
    }

    this.enablePointerLockClick(false);
    if (document.pointerLockElement === document.body) {
      document.exitPointerLock?.();
    }
    this.controls.enabled = false;
    this.renderer.domElement.style.cursor = (this.isDirectionDragging || this.isMoveDragging) ? 'grabbing' : 'grab';
  }

  isPointerLocked() {
    return document.pointerLockElement === document.body ||
      document.mozPointerLockElement === document.body ||
      document.webkitPointerLockElement === document.body;
  }

  isDragPanControlEnabled() {
    return this.renderInteractionMode === 'walkthrough' && this.renderControlType === 'drag-pan';
  }

  isKeyboardWalkEnabled() {
    return this.renderInteractionMode === 'walkthrough' &&
      this.renderControlType === 'pointer-lock' &&
      this.isPointerLocked();
  }

  shouldIgnoreKeyboardEvent(event) {
    const activeElement = document.activeElement;
    const activeTag = activeElement?.tagName?.toLowerCase();
    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
      return true;
    }
    if (activeElement?.isContentEditable) {
      return true;
    }

    const eventTag = event?.target?.tagName?.toLowerCase();
    if (eventTag === 'input' || eventTag === 'textarea' || eventTag === 'select') {
      return true;
    }

    return false;
  }

  getRenderCameraHeightLimit() {
    const fallbackLimit = Number.isFinite(this.renderCameraHeightLimit) ? this.renderCameraHeightLimit : 280;
    const scene = this.props?.state?.scene;

    if (!scene?.get) {
      return fallbackLimit;
    }

    const selectedLayerId = scene.get('selectedLayer');
    if (!selectedLayerId) {
      return fallbackLimit;
    }

    const lines = scene.getIn(['layers', selectedLayerId, 'lines']);
    if (!lines?.forEach || lines.size === 0) {
      return fallbackLimit;
    }

    let maxWallHeight = 0;
    lines.forEach((line) => {
      const wallHeight = Number(line?.getIn?.(['properties', 'height', 'length']));
      if (!Number.isNaN(wallHeight) && wallHeight > maxWallHeight) {
        maxWallHeight = wallHeight;
      }
    });

    return maxWallHeight > 0 ? maxWallHeight : fallbackLimit;
  }

  getRenderSlabHeight() {
    const scene = this.props?.state?.scene;
    const selectedLayerId = scene?.get?.('selectedLayer');
    if (!selectedLayerId) return 0;

    const areas = scene?.getIn?.(['layers', selectedLayerId, 'areas']);
    if (!areas?.forEach) return 0;

    let slabHeight = 0;
    areas.forEach((area) => {
      const floorThickness = Number(area?.getIn?.(['properties', 'floorThickness', 'length']));
      if (!Number.isNaN(floorThickness) && floorThickness > slabHeight) {
        slabHeight = floorThickness;
      }
    });

    return slabHeight;
  }

  getRenderFloorLevel() {
    const scene = this.props?.state?.scene;
    const selectedLayerId = scene?.get?.('selectedLayer');
    const slabHeight = this.getRenderSlabHeight();

    if (selectedLayerId) {
      const layerAltitude = Number(scene?.getIn?.(['layers', selectedLayerId, 'altitude']));
      if (!Number.isNaN(layerAltitude)) {
        return layerAltitude + slabHeight;
      }
    }

    const bboxFloor = this.planData?.boundingBox?.min?.y;
    if (Number.isFinite(bboxFloor)) {
      return bboxFloor + slabHeight;
    }

    return slabHeight;
  }

  clampRenderCameraHeight(heightValue) {
    const heightLimit = this.getRenderCameraHeightLimit();
    return Math.max(0, Math.min(heightLimit, heightValue));
  }

  getRenderPreviewState() {
    if (!this.camera || !this.controls?.getObject) return null;

    const position = new Three.Vector3();
    const target = new Three.Vector3();
    const direction = new Three.Vector3();

    this.camera.getWorldPosition(position);
    this.camera.getWorldDirection(direction);
    target.copy(position).add(direction.multiplyScalar(220));

    return { position, target };
  }

  setRenderPreviewState(nextState = {}) {
    if (!this.controls?.getObject) return;

    const controlObject = this.controls.getObject();
    const previewState = this.getRenderPreviewState();
    const nextPosition = nextState.position || previewState?.position;
    const nextTarget = nextState.target || previewState?.target;

    if (nextPosition) {
      const nextX = Number(nextPosition.x);
      const nextZ = Number(nextPosition.z);

      if (!Number.isNaN(nextX)) controlObject.position.x = nextX;
      if (!Number.isNaN(nextZ)) controlObject.position.z = nextZ;
    }

    const cameraWorldY = this.camera?.getWorldPosition(new Three.Vector3()).y ?? controlObject.position.y;
    if (nextTarget) {
      const dx = Number(nextTarget.x) - controlObject.position.x;
      const dz = Number(nextTarget.z) - controlObject.position.z;
      const horizontalDistance = Math.hypot(dx, dz);

      if (horizontalDistance > 1e-6) {
        controlObject.rotation.y = Math.atan2(-dx, -dz);

        const nextTargetY = Number(nextTarget.y);
        if (!Number.isNaN(nextTargetY)) {
          const nextPitch = Three.MathUtils.radToDeg(Math.atan2(nextTargetY - cameraWorldY, horizontalDistance));
          this.setRenderCameraVerticalRotation(nextPitch);
        }
      }
    }

    controlObject.position.y = this.getRenderFloorLevel() + this.renderCameraHeight;
    this._sceneDirtyForFrame = true;
  }

  componentDidMount() {
    this.stopRendering = false; // Reset in case this instance was previously unmounted and remounted

    let prevTime = performance.now();
    let velocity = new Three.Vector3();
    let direction = new Three.Vector3();
    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let canJump = false;

    let {catalog} = this.context;

    let actions = {
      areaActions: this.context.areaActions,
      holesActions: this.context.holesActions,
      itemsActions: this.context.itemsActions,
      linesActions: this.context.linesActions,
      projectActions: this.context.projectActions
    };

    let {state} = this.props;
    let data = state.scene;
    let canvasWrapper = this.canvasWrapperRef.current;

    let scene3D = new Three.Scene();

    // As I need to show the pointer above all scene objects, I use this workaround http://stackoverflow.com/a/13309722
    let sceneOnTop = new Three.Scene();

    //RENDERER
    this.renderer.setClearColor(new Three.Color(SharedStyle.COLORS.white));
    this.renderer.setSize(this.width, this.height);

    /* Set user initial position */
    let humanHeight = this.clampRenderCameraHeight(this.renderCameraHeight);
    this.renderCameraHeight = humanHeight;

    // Called once all GLB assets finish loading — reposition camera to plan center
    const onBoundingBoxReady = (planData) => {
      const center = planData.boundingBoxCenter;
      const floorY = this.getRenderFloorLevel();
      if (center) {
        this.controls.getObject().position.set(center.x, floorY + this.renderCameraHeight, center.z);
      }
    };

    // LOAD DATA
    this.planData = parseData(data, actions, catalog, onBoundingBoxReady);
    this._refreshLodEntries(this.planData);

    scene3D.add(this.planData.plan);

    // CAMERA
    let aspectRatio = this.width / this.height;
    let camera = new Three.PerspectiveCamera(45, aspectRatio, 0.1, 300000);

    sceneOnTop.add(camera); // The pointer is on the camera so I show it above all

    // Set position for the camera
    camera.position.set(0, 0, 0);
    camera.up = new Three.Vector3(0, 1, 0);

    // HELPER AXIS
    // let axisHelper = new Three.AxisHelper(100);
    // scene3D.add(axisHelper);

    // LIGHT
    let light = new Three.AmbientLight(0xafafaf); // soft white light
    scene3D.add(light);

    // Add another light
    let pointLight = new Three.PointLight(SharedStyle.COLORS.white, 0.4, 1000);
    pointLight.position.set(0, 0, 0);
    scene3D.add(pointLight);

    // POINTER LOCK

    let {controls, pointerlockChangeEvent, requestPointerLockEvent} = initPointerLock(camera, this.renderer.domElement);
    this.controls = controls;
    this.pointerlockChangeListener = pointerlockChangeEvent;
    this.requestPointerLockEvent = requestPointerLockEvent;
    this.pointerLockClickEnabled = true;

    this.renderPointerLockSyncEvent = () => {
      if (!this.controls) return;

      if (this.renderControlType === 'pointer-lock') {
        if (this.isPointerLocked()) {
          return;
        }

        this.renderControlType = 'drag-pan';
        this.resetKeyboardMovement?.();
        window.dispatchEvent(new CustomEvent('render-control-type-change', { detail: 'drag-pan' }));
      }

      this.applyRenderInteractionMode();
    };
    document.addEventListener('pointerlockchange', this.renderPointerLockSyncEvent);
    document.addEventListener('mozpointerlockchange', this.renderPointerLockSyncEvent);
    document.addEventListener('webkitpointerlockchange', this.renderPointerLockSyncEvent);

    // Place camera at origin until onBoundingBoxReady fires and moves it to plan center
    this.controls.getObject().position.set(0, this.getRenderFloorLevel() + this.renderCameraHeight, 0);
    sceneOnTop.add(this.controls.getObject()); // Add the pointer lock controls to the scene that will be rendered on top

    // Add move controls on the page
    this.keyDownEvent = (event) => {
      if (this.shouldIgnoreKeyboardEvent(event)) return;
      if (!this.isKeyboardWalkEnabled()) return;

      let moveResult = firstPersonOnKeyDown(event, moveForward, moveLeft, moveBackward, moveRight, canJump, velocity);
      moveForward = moveResult.moveForward;
      moveLeft = moveResult.moveLeft;
      moveBackward = moveResult.moveBackward;
      moveRight = moveResult.moveRight;
      canJump = moveResult.canJump;
    };

    this.keyUpEvent = (event) => {
      if (this.shouldIgnoreKeyboardEvent(event)) return;
      const hasActiveMovement = moveForward || moveBackward || moveLeft || moveRight;
      if (!this.isKeyboardWalkEnabled() && !hasActiveMovement) return;

      let moveResult = firstPersonOnKeyUp(event, moveForward, moveLeft, moveBackward, moveRight, canJump);
      moveForward = moveResult.moveForward;
      moveLeft = moveResult.moveLeft;
      moveBackward = moveResult.moveBackward;
      moveRight = moveResult.moveRight;
      canJump = moveResult.canJump;
    };

    this.resetKeyboardMovement = () => {
      moveForward = false;
      moveBackward = false;
      moveLeft = false;
      moveRight = false;
      canJump = false;
      velocity.set(0, 0, 0);
    };

    document.addEventListener('keydown', this.keyDownEvent);
    document.addEventListener('keyup', this.keyUpEvent);

    // OBJECT PICKING
    let toIntersect = [this.planData.plan];

    let mouseVector = new Three.Vector2(0, 0);
    let raycaster = new Three.Raycaster();

    this.firstPersonMouseDown = (event) => {

      if (this.isDragPanControlEnabled()) {
        return;
      }

      // First of all I check if controls are enabled

      if (this.controls.enabled) {
        event.preventDefault();

        /* Per avere la direzione da assegnare al raycaster, chiamo il metodo getDirection di PointerLockControls,
         * che restituisce una funzione che a sua volta prende un vettore, vi scrive i valori degli oggetti
         * pitch e yaw e lo restituisce */

        raycaster.setFromCamera(mouseVector, camera);

        let intersects = raycaster.intersectObjects(toIntersect, true);
        if (intersects.length > 0 && !(isNaN(intersects[0].distance))) {
          intersects[0].object.interact && intersects[0].object.interact();
        } else {
          this.context.projectActions.unselectAll();
        }
      }

    };

    document.addEventListener('mousedown', this.firstPersonMouseDown, false);

    this.dragPanMouseDown = (event) => {
      if (!this.isDragPanControlEnabled()) return;
      if (this.isPointerLocked()) return;

      if (event.button !== 0 && event.button !== 2) return;

      if (event.button === 0) {
        this.isDirectionDragging = true;
      }

      if (event.button === 2) {
        this.isMoveDragging = true;
      }

      this.lastRenderDragPoint = { x: event.clientX, y: event.clientY };

      this.applyRenderInteractionMode();
      event.preventDefault();
    };

    this.dragPanMouseMove = (event) => {
      if ((!this.isDirectionDragging && !this.isMoveDragging) || !this.controls) return;
      if (!this.isDragPanControlEnabled()) return;

      const dx = event.clientX - this.lastRenderDragPoint.x;
      const dy = event.clientY - this.lastRenderDragPoint.y;
      this.lastRenderDragPoint = { x: event.clientX, y: event.clientY };

      const rotateFactor = 0.005;
      const moveFactor = 0.45;
      const pitchFactor = 0.2;
      const worldUp = new Three.Vector3(0, 1, 0);
      const object = this.controls.getObject();

      if (this.isDirectionDragging) {
        object.rotation.y -= dx * rotateFactor;
        const nextVerticalRotation = Math.max(-80, Math.min(80, this.renderCameraVerticalRotation - (dy * pitchFactor)));
        this.setRenderCameraVerticalRotation(nextVerticalRotation);
      }

      if (this.isMoveDragging) {
        const yaw = object.rotation.y;
        const cameraRight = new Three.Vector3(1, 0, 0).applyAxisAngle(worldUp, yaw).normalize();
        const cameraForward = new Three.Vector3(0, 0, -1).applyAxisAngle(worldUp, yaw).normalize();

        object.position.addScaledVector(cameraRight, -dx * moveFactor);
        object.position.addScaledVector(cameraForward, dy * moveFactor);
        object.position.y = this.getRenderFloorLevel() + this.renderCameraHeight;
      }

      this._sceneDirtyForFrame = true;
    };

    this.dragPanContextMenu = (event) => {
      if (this.isDragPanControlEnabled()) {
        event.preventDefault();
      }
    };

    this.dragPanMouseUp = () => {
      if (!this.isDirectionDragging && !this.isMoveDragging) return;
      this.isDirectionDragging = false;
      this.isMoveDragging = false;
      this.applyRenderInteractionMode();
    };

    this.dragPanMouseWheel = (event) => {
      if (!this.isDragPanControlEnabled()) return;
      if (!this.controls?.getObject) return;

      event.preventDefault();

      const object = this.controls.getObject();
      const worldUp = new Three.Vector3(0, 1, 0);
      const cameraForward = new Three.Vector3(0, 0, -1).applyAxisAngle(worldUp, object.rotation.y).normalize();
      const wheelDelta = Number(event.deltaY) || 0;
      const moveStep = Math.max(20, Math.min(180, Math.abs(wheelDelta) * 0.25));
      const directionScale = wheelDelta < 0 ? moveStep : -moveStep;

      object.position.addScaledVector(cameraForward, directionScale);
      object.position.y = this.getRenderFloorLevel() + this.renderCameraHeight;
      this._sceneDirtyForFrame = true;
    };

    this.renderer.domElement.addEventListener('mousedown', this.dragPanMouseDown, false);
    this.renderer.domElement.addEventListener('contextmenu', this.dragPanContextMenu, false);
    this.renderer.domElement.addEventListener('wheel', this.dragPanMouseWheel, { passive: false });
    window.addEventListener('mousemove', this.dragPanMouseMove, false);
    window.addEventListener('mouseup', this.dragPanMouseUp, false);

    this.renderer.domElement.style.display = 'block';

    // add the output of the renderer to the html element
    canvasWrapper.appendChild(this.renderer.domElement);
    this.renderer.autoClear = false;

    let render = () => {

      if (!this.stopRendering) {
        const floorY = this.getRenderFloorLevel();
        const minWorldY = floorY;
        const maxWorldY = floorY + this.getRenderCameraHeightLimit();
        const desiredWorldY = Math.max(minWorldY, Math.min(maxWorldY, floorY + this.renderCameraHeight));

        let multiplier = 5;

        let time = performance.now();
        let delta = ( time - prevTime ) / 1000 * multiplier;

        if (!this.isKeyboardWalkEnabled()) {
          moveForward = false;
          moveBackward = false;
          moveLeft = false;
          moveRight = false;
          canJump = false;
          velocity.x = 0;
          velocity.z = 0;
          velocity.y = 0;
        }

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 100.0 * delta / multiplier; // 100.0 = mass

        if (Math.abs(velocity.x) < 0.001) velocity.x = 0;
        if (Math.abs(velocity.z) < 0.001) velocity.z = 0;
        if (Math.abs(velocity.y) < 0.001) velocity.y = 0;

        direction.z = Number( moveForward ) - Number( moveBackward );
        direction.x = Number( moveLeft ) - Number( moveRight );
        direction.normalize(); // this ensures consistent movements in all directions

        if ( moveForward || moveBackward ) velocity.z -= direction.z * 400.0 * delta;
        if ( moveLeft || moveRight ) velocity.x -= direction.x * 400.0 * delta;

        this.controls.getObject().translateX(velocity.x * delta);
        this.controls.getObject().translateY(velocity.y * delta);
        this.controls.getObject().translateZ(velocity.z * delta);

        if (this.renderInteractionMode === 'walkthrough') {
          velocity.y = 0;
          this.controls.getObject().position.y = desiredWorldY;
          canJump = false;
        } else if ( this.controls.getObject().position.y < desiredWorldY ) {
          velocity.y = 0;
          this.controls.getObject().position.y = desiredWorldY;
          canJump = true;
        } else if (this.controls.getObject().position.y > maxWorldY) {
          velocity.y = 0;
          this.controls.getObject().position.y = maxWorldY;
        }

        prevTime = time;

        // Set light position
        let controlObjectPosition = this.controls.getObject().position;
        pointLight.position.set(controlObjectPosition.x, controlObjectPosition.y, controlObjectPosition.z);

        if (this._lodDirty) {
          this._refreshLodEntries(this.planData);
        }

        const cameraChanged = this._didCameraStateChange(camera);
        if (cameraChanged || this._sceneDirtyForFrame) {
          for (let index = 0; index < this._lodEntries.length; index++) {
            this._lodEntries[index].update(camera);
          }
          this._sceneDirtyForFrame = false;
        }


        this.renderer.clear();                     // clear buffers
        this.renderer.render(scene3D, camera);     // render scene 1
        this.renderer.clearDepth();                // clear depth buffer
        this.renderer.render(sceneOnTop, camera);  // render scene 2

        requestAnimationFrame(render);
      }
    };

    render();

    this.camera = camera;
    this.scene3D = scene3D;
    this.sceneOnTop = sceneOnTop;
    window.__viewer3D = this;
    this.applyRenderInteractionMode();
    // this.planData = planData;
  }

  componentWillUnmount() {

    if (window.__viewer3D === this) {
      window.__viewer3D = null;
    }

    this.stopRendering = true;
    this.renderer.autoClear = true;
    document.removeEventListener('mousedown', this.firstPersonMouseDown);
    document.removeEventListener('keydown', this.keyDownEvent);
    document.removeEventListener('keyup', this.keyUpEvent);
    document.removeEventListener('pointerlockchange', this.pointerlockChangeListener);
    document.removeEventListener('mozpointerlockchange', this.pointerlockChangeListener);
    document.removeEventListener('webkitpointerlockchange', this.pointerlockChangeListener);
    document.removeEventListener('pointerlockchange', this.renderPointerLockSyncEvent);
    document.removeEventListener('mozpointerlockchange', this.renderPointerLockSyncEvent);
    document.removeEventListener('webkitpointerlockchange', this.renderPointerLockSyncEvent);
    this.renderer.domElement.removeEventListener('click', this.requestPointerLockEvent);
    this.renderer.domElement.removeEventListener('mousedown', this.dragPanMouseDown);
    this.renderer.domElement.removeEventListener('contextmenu', this.dragPanContextMenu);
    this.renderer.domElement.removeEventListener('wheel', this.dragPanMouseWheel);
    window.removeEventListener('mousemove', this.dragPanMouseMove);
    window.removeEventListener('mouseup', this.dragPanMouseUp);
    this.renderer.domElement.style.cursor = 'default';
    this.resetKeyboardMovement?.();

    disposeScene(this.scene3D);

    this.scene3D.remove(this.planData.plan);

    this.scene3D = null;
    this.planData = null;
    this.renderer.renderLists.dispose();
  }

  setRenderInteractionMode(mode = 'default') {
    if (this.renderInteractionMode === mode) return;
    this.renderInteractionMode = mode;
    if (mode !== 'walkthrough') {
      this.resetKeyboardMovement?.();
    }
    this.applyRenderInteractionMode();
  }

  setRenderControlType(type = 'drag-pan') {
    if (type !== 'drag-pan' && type !== 'pointer-lock') return;
    if (this.renderControlType === type) return;
    this.renderControlType = type;
    if (type !== 'pointer-lock') {
      this.resetKeyboardMovement?.();
    }
    this.applyRenderInteractionMode();
  }

  setRenderCameraHeight(heightValue) {
    if (!this.controls) return;

    const numericHeight = Number(heightValue);
    if (Number.isNaN(numericHeight)) return;

    const clampedHeight = this.clampRenderCameraHeight(numericHeight);
    const floorY = this.getRenderFloorLevel();
    const nextWorldY = floorY + clampedHeight;
    const currentWorldY = this.controls.getObject().position.y;

    if (Math.abs(this.renderCameraHeight - clampedHeight) < 1e-6 && Math.abs(currentWorldY - nextWorldY) < 1e-6) {
      return;
    }

    this.renderCameraHeight = clampedHeight;
    this.controls.getObject().position.y = nextWorldY;
    this._sceneDirtyForFrame = true;

  }

  setRenderCameraHeightLimit(heightValue) {
    const numericHeight = Number(heightValue);
    if (Number.isNaN(numericHeight)) return;

    const clampedLimit = Math.max(0, numericHeight);
    if (Math.abs(this.renderCameraHeightLimit - clampedLimit) < 1e-6) {
      return;
    }

    this.renderCameraHeightLimit = clampedLimit;

    if (this.renderCameraHeight > this.renderCameraHeightLimit) {
      this.setRenderCameraHeight(this.renderCameraHeight);
    }
  }

  setRenderCameraVerticalRotation(verticalDegrees) {
    if (!this.controls) return;

    const numericDegrees = Number(verticalDegrees);
    if (Number.isNaN(numericDegrees)) return;

    const clampedDegrees = Math.max(-80, Math.min(80, numericDegrees));
    const pitchRadians = Three.MathUtils.degToRad(clampedDegrees);

    const pitchObject = this.getPitchObject();
    const currentPitchRadians = pitchObject ? pitchObject.rotation.x : Three.MathUtils.degToRad(this.renderCameraVerticalRotation);
    if (Math.abs(this.renderCameraVerticalRotation - clampedDegrees) < 1e-6 && Math.abs(currentPitchRadians - pitchRadians) < 1e-6) {
      return;
    }

    this.renderCameraVerticalRotation = clampedDegrees;
    if (pitchObject) {
      pitchObject.rotation.x = pitchRadians;
    }

    this._sceneDirtyForFrame = true;
    this.emitRenderCameraVerticalRotationChange(clampedDegrees);
  }

  componentDidUpdate(prevProps) {
    let {width, height} = this.props;
    let {camera, renderer, scene3D, sceneOnTop, planData} = this;

    let actions = {
      areaActions: this.context.areaActions,
      holesActions: this.context.holesActions,
      itemsActions: this.context.itemsActions,
      linesActions: this.context.linesActions,
      projectActions: this.context.projectActions
    };

    this.width = width;
    this.height = height;

    if (this.props.state.scene !== prevProps.state.scene) {
      let changedValues = diff(prevProps.state.scene, this.props.state.scene);
      updateScene(planData, this.props.state.scene, prevProps.state.scene, changedValues.toJS(), actions, this.context.catalog);
      this._lodDirty = true;
      this._sceneDirtyForFrame = true;
      this.setRenderCameraHeight(this.renderCameraHeight);
    }

    if (width !== this._lastRendererWidth || height !== this._lastRendererHeight) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      this._lastRendererWidth = width;
      this._lastRendererHeight = height;
      this._sceneDirtyForFrame = true;
    }

  }

  render() {
    return React.createElement("div", {
      ref: this.canvasWrapperRef
    });
  }
}

Viewer3DFirstPerson.propTypes = {
  state: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired
};

Viewer3DFirstPerson.contextType = PlannerContext;
