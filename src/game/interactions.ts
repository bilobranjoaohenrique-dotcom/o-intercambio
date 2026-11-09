import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Culling/ray';
import type { InteractionTarget } from './types';

export const INTERACTION_REACH = 2.2;
const SCAN_INTERVAL_MS = 1000 / 12;

/** Interactions use the camera's real centre ray. Pickable walls, furniture and
 * merged scenery participate in the same nearest-hit test as the targets. */
export function createInteractions(scene: Scene, camera: Camera, targets: readonly InteractionTarget[]) {
  const registry = new WeakMap<object, InteractionTarget>();
  for (const target of targets) for (const mesh of target.meshes) registry.set(mesh, target);
  let current: InteractionTarget | null = null;
  let scannedAt = -Infinity;

  function pick(): InteractionTarget | null {
    const ray = camera.getForwardRay(INTERACTION_REACH);
    const hit = scene.pickWithRay(ray, mesh => mesh.isPickable && mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0, false);
    if (!hit?.hit || !hit.pickedMesh || hit.distance > INTERACTION_REACH) return null;
    let node: { parent: object | null } | null = hit.pickedMesh;
    while (node) {
      const target = registry.get(node);
      if (target) return target;
      node = node.parent as typeof node;
    }
    // Imported character meshes join their target after this registry is
    // created. Register the actual hit lazily, keeping their existing prompts.
    for (const target of targets) if (target.meshes.includes(hit.pickedMesh)) {
      registry.set(hit.pickedMesh, target);
      return target;
    }
    return null;
  }

  return {
    update(): InteractionTarget | null {
      const now = performance.now();
      if (now - scannedAt >= SCAN_INTERVAL_MS) {
        current = pick(); scannedAt = now;
      }
      return current;
    },
    activate(): { id: string; text?: string } | null {
      // A movement, fast mouse turn or closing door must invalidate a stale
      // prompt even between the throttled display scans.
      current = pick(); scannedAt = performance.now();
      if (!current) return null;
      const target = current, text = target.execute();
      return typeof text === 'string' ? { id: target.id, text } : { id: target.id };
    },
    clear() { current = null; scannedAt = -Infinity; },
    get current() { return current; },
  };
}
