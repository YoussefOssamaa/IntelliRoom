import * as Three from "three";
import { RoomEnvironment } from "three-stdlib";

export function getSharedViewerEnvironment(renderer) {
  if (window.__viewer3DEnvironmentRenderTarget?.texture) {
    return window.__viewer3DEnvironmentRenderTarget.texture;
  }

  const pmremGenerator = new Three.PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  const environmentRenderTarget = pmremGenerator.fromScene(roomEnvironment);

  roomEnvironment.dispose?.();
  pmremGenerator.dispose();

  window.__viewer3DEnvironmentRenderTarget = environmentRenderTarget;
  return environmentRenderTarget.texture;
}
