import type { Point3 } from './layout';

export interface ExteriorPlane { normal: Point3; d: number }
export interface ExteriorBounds { min: Point3; max: Point3 }
export interface ExteriorAperture {
  id: string;
  center: Point3;
  /** Four perimeter corners, conservatively including the full wall opening. */
  corners: readonly Point3[];
  outward: Point3;
  bounds: ExteriorBounds;
}
export interface ExteriorPortalSelection {
  fallback: boolean;
  reason: 'portals' | 'outside-interior' | 'near-aperture-plane' | 'missing-apertures' | 'invalid-planes';
  visibleApertures: string[];
  cones: ExteriorPlane[][];
}

const dot = (a: Point3, b: Point3) => a.x * b.x + a.y * b.y + a.z * b.z;
const difference = (a: Point3, b: Point3): Point3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

/** Positive half-spaces include the boundary. Testing the most positive AABB
 * corner only rejects boxes wholly outside a plane; intersecting/sliver bounds
 * deliberately remain visible even when the box overestimates its geometry. */
export function exteriorBoundsIntersectPlanes(bounds: ExteriorBounds, planes: readonly ExteriorPlane[], epsilon = .025) {
  return planes.every(plane => {
    const n = plane.normal;
    const mostPositive = n.x * (n.x >= 0 ? bounds.max.x : bounds.min.x) +
      n.y * (n.y >= 0 ? bounds.max.y : bounds.min.y) +
      n.z * (n.z >= 0 ? bounds.max.z : bounds.min.z) + plane.d;
    return mostPositive >= -epsilon;
  });
}

function apertureCone(camera: Point3, aperture: ExteriorAperture): ExteriorPlane[] | null {
  if (aperture.corners.length !== 4) return null;
  const planes: ExteriorPlane[] = [{ normal: aperture.outward, d: -dot(aperture.outward, aperture.center) }];
  for (let i = 0; i < 4; i++) {
    const a = difference(aperture.corners[i], camera), b = difference(aperture.corners[(i + 1) % 4], camera);
    const n = { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
    const length = Math.hypot(n.x, n.y, n.z);
    if (!Number.isFinite(length) || length < 1e-8) return null;
    n.x /= length; n.y /= length; n.z /= length;
    let d = -dot(n, camera);
    if (dot(n, aperture.center) + d < 0) { n.x *= -1; n.y *= -1; n.z *= -1; d *= -1; }
    planes.push({ normal: n, d });
  }
  return planes;
}

/** A visibility bound, not an occlusion/raycast approximation. Every actual
 * window inside the camera frustum contributes its whole outward cone. Room
 * walls may leave extra draws; they can never cause visible edges to disappear.
 * Near a window or outside the supplied interior, ordinary rendering is kept. */
export function selectHostHouseExteriorPortals(camera: Point3, frustum: readonly ExteriorPlane[],
  apertures: readonly ExteriorAperture[], interior: ExteriorBounds): ExteriorPortalSelection {
  const fallback = (reason: ExteriorPortalSelection['reason']): ExteriorPortalSelection =>
    ({ fallback: true, reason, visibleApertures: [], cones: [] });
  if (!apertures.length) return fallback('missing-apertures');
  if (frustum.length !== 6 || frustum.some(plane => !Number.isFinite(plane.d) ||
    ![plane.normal.x, plane.normal.y, plane.normal.z].every(Number.isFinite))) return fallback('invalid-planes');
  if (camera.x < interior.min.x || camera.x > interior.max.x || camera.y < interior.min.y ||
    camera.y > interior.max.y || camera.z < interior.min.z || camera.z > interior.max.z) return fallback('outside-interior');
  // A global near-plane fallback is intentionally conservative, including the
  // moment an eye crosses a pane or its clipped near-plane intersection.
  if (apertures.some(aperture => dot(aperture.outward, difference(camera, aperture.center)) >= -.20))
    return fallback('near-aperture-plane');
  const cones: ExteriorPlane[][] = [], visibleApertures: string[] = [];
  for (const aperture of apertures) {
    if (!exteriorBoundsIntersectPlanes(aperture.bounds, frustum)) continue;
    const cone = apertureCone(camera, aperture);
    if (!cone) return fallback('invalid-planes');
    cones.push(cone); visibleApertures.push(aperture.id);
  }
  return { fallback: false, reason: 'portals', visibleApertures, cones };
}

export function hostHouseExteriorBoundsVisible(bounds: ExteriorBounds, selection: ExteriorPortalSelection, sky = false) {
  if (selection.fallback) return true;
  if (!selection.cones.length) return false;
  // The actual shared sky encloses the house. Keep it whenever a window is
  // potentially visible, including off-axis panes and horizon-only views.
  return sky || selection.cones.some(cone => exteriorBoundsIntersectPlanes(bounds, cone));
}
