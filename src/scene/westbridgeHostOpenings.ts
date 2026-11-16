import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Obstacle } from '../game/types';

export type HostGeometryBox = { min: number[]; max: number[] };
type Box = HostGeometryBox;
type Corner = { source: number[]; id?: number; values?: Record<string, number[]> };
const HOST = 'HOST_FAMILY_HOUSE_DANIEL_HELEN · ';
const EPS = 1e-7;

/** The original host facade consists of closed boxes and decorative panes.
 * Cut only that house's siding, keeping all old vertices/UVs verbatim and
 * interpolating new boundary vertices on their original textured triangles. */
export function subtractHostGeometryBoxes(mesh: Mesh, openings: readonly Box[], originX = 500,
  facePredicate?: (source: readonly number[][]) => boolean) {
  const position = mesh.getVerticesData(VertexBuffer.PositionKind), oldIndices = mesh.getIndices();
  if (!position || !oldIndices?.length) return { removedTriangles: 0, addedTriangles: 0 };
  const kinds = mesh.getVerticesDataKinds();
  const sizes = Object.fromEntries(kinds.map(kind => [kind, mesh.getVertexBuffer(kind)!.getSize()]));
  const data = Object.fromEntries(kinds.map(kind => [kind, Array.from(mesh.getVerticesData(kind)!)]));
  const world = mesh.computeWorldMatrix(true), corners: Corner[] = [];
  for (let i = 0; i < position.length; i += 3) {
    const p = Vector3.TransformCoordinates(Vector3.FromArray(position, i), world);
    corners.push({ source: [originX - p.x, p.y, p.z], id: i / 3 });
  }
  function values(corner: Corner, kind: string) {
    return corner.values?.[kind] ?? data[kind].slice(corner.id! * sizes[kind], (corner.id! + 1) * sizes[kind]);
  }
  function mix(a: Corner, b: Corner, t: number): Corner {
    if (t <= EPS) return a;
    if (t >= 1 - EPS) return b;
    return { source: a.source.map((v, i) => v + (b.source[i] - v) * t), values: Object.fromEntries(kinds.map(kind => {
      const av = values(a, kind), bv = values(b, kind);
      const result = av.map((v, i) => v + (bv[i] - v) * t);
      if (kind === VertexBuffer.NormalKind || kind === VertexBuffer.TangentKind) {
        const length = Math.hypot(...result.slice(0, 3));
        if (length) for (let i = 0; i < 3; i++) result[i] /= length;
      }
      return [kind, result];
    })) };
  }
  function split(poly: Corner[], axis: number, limit: number, sign: number) {
    const distances = poly.map(p => (p.source[axis] - limit) * sign);
    if (distances.every(d => d >= -EPS)) return { inside: poly, outside: [] as Corner[] };
    if (distances.every(d => d <= EPS)) return { inside: [] as Corner[], outside: poly };
    const inside: Corner[] = [], outside: Corner[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = (a.source[axis] - limit) * sign, db = (b.source[axis] - limit) * sign;
      if (da >= -EPS) inside.push(a);
      if (da <= EPS) outside.push(a);
      if ((da > EPS && db < -EPS) || (da < -EPS && db > EPS)) {
        const edge = mix(a, b, da / (da - db)); inside.push(edge); outside.push(edge);
      }
    }
    return { inside, outside };
  }
  function subtract(poly: Corner[], box: Box): Corner[][] {
    if ([0, 1, 2].some(axis => Math.max(...poly.map(p => p.source[axis])) < box.min[axis] - EPS ||
      Math.min(...poly.map(p => p.source[axis])) > box.max[axis] + EPS)) return [poly];
    const result: Corner[][] = [];
    let rest = poly;
    for (let axis = 0; axis < 3; axis++) for (const [limit, sign] of [[box.min[axis], 1], [box.max[axis], -1]]) {
      const cut = split(rest, axis, limit, sign);
      if (cut.outside.length >= 3) result.push(cut.outside);
      rest = cut.inside;
      if (rest.length < 3) return result;
    }
    return result;
  }
  let removedTriangles = 0, addedTriangles = 0;
  const indices: number[] = [];
  function index(corner: Corner) {
    if (corner.id !== undefined) return corner.id;
    const id = data[VertexBuffer.PositionKind].length / 3;
    for (const kind of kinds) data[kind].push(...corner.values![kind]);
    corner.id = id;
    return id;
  }
  for (let i = 0; i < oldIndices.length; i += 3) {
    const original = [corners[oldIndices[i]], corners[oldIndices[i + 1]], corners[oldIndices[i + 2]]];
    if (facePredicate && !facePredicate(original.map(corner => corner.source))) {
      indices.push(oldIndices[i], oldIndices[i + 1], oldIndices[i + 2]); continue;
    }
    let polygons = [original];
    for (const box of openings) polygons = polygons.flatMap(poly => subtract(poly, box));
    if (polygons.length === 1 && polygons[0].length === 3 && polygons[0].every((p, n) => p === original[n])) {
      indices.push(oldIndices[i], oldIndices[i + 1], oldIndices[i + 2]); continue;
    }
    removedTriangles++;
    for (const polygon of polygons) for (let n = 1; n < polygon.length - 1; n++) {
      const a = polygon[0], b = polygon[n], c = polygon[n + 1];
      const ab = b.source.map((v, k) => v - a.source[k]), ac = c.source.map((v, k) => v - a.source[k]);
      const area = Math.hypot(ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]);
      if (area < 1e-10) continue;
      indices.push(index(a), index(b), index(c)); addedTriangles++;
    }
  }
  if (removedTriangles) {
    for (const kind of kinds) mesh.setVerticesData(kind, data[kind], false, sizes[kind]);
    mesh.setIndices(indices); mesh.refreshBoundingInfo();
  }
  return { removedTriangles, addedTriangles };
}

function paneBounds(mesh: Mesh, originX: number) {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!, indices = mesh.getIndices()!;
  const count = positions.length / 3, parent = Int32Array.from({ length: count }, (_, i) => i);
  const source: number[][] = [], weld = new Map<string, number>(), world = mesh.computeWorldMatrix(true);
  function find(v: number): number { while (parent[v] !== v) { parent[v] = parent[parent[v]]; v = parent[v]; } return v; }
  function join(a: number, b: number) { a = find(a); b = find(b); if (a !== b) parent[b] = a; }
  for (let i = 0; i < count; i++) {
    const p = Vector3.TransformCoordinates(Vector3.FromArray(positions, i * 3), world);
    const point = [originX - p.x, p.y, p.z]; source.push(point);
    const key = point.map(v => Math.round(v * 1e4)).join(',');
    if (weld.has(key)) join(i, weld.get(key)!); else weld.set(key, i);
  }
  for (let i = 0; i < indices.length; i += 3) { join(indices[i], indices[i + 1]); join(indices[i + 1], indices[i + 2]); }
  const groups = new Map<number, Box>();
  for (let i = 0; i < count; i++) {
    const id = find(i), box = groups.get(id) ?? { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    source[i].forEach((v, axis) => { box.min[axis] = Math.min(box.min[axis], v); box.max[axis] = Math.max(box.max[axis], v); });
    groups.set(id, box);
  }
  return { boxes: [...groups.values()], source };
}

function isDoorPoint(p: number[]) { return p[0] > 19.50 && p[0] < 20.61 && p[1] > .39 && p[1] < 2.49 && p[2] > -12.74 && p[2] < -12.48; }

/** Only the supplied blue host shell is opened. Other houses and the original
 * GLB file are untouched. The original door can still close the real opening. */
export function applyWestbridgeHostOpenings(meshes: readonly AbstractMesh[], originX = 500) {
  const host = meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.name.startsWith(HOST));
  const pane = host.find(mesh => / · WindowGlow\./.test(mesh.name));
  if (!pane) throw Error('Os vidros originais da casa dos anfitriões não foram localizados.');
  const panes = paneBounds(pane, originX), frontDoorMeshes: Mesh[] = [], ownMaterials: PBRMaterial[] = [];
  const hinge = new TransformNode('Daniel e Helen · dobradiça da porta original', pane.getScene());
  hinge.parent = pane.parent; hinge.position.set(19.5962, .4003, -12.68);
  let frontDoorOpen = false;
  // Standard panes are only about 10cm deep. A reveal also includes the
  // remaining 2–10cm of siding-course caps behind that glass. Extend only the
  // normal depth until it overlaps the hollow interior: aperture width and
  // height, all cream frames and the street-facing silhouette stay intact.
  // The two oblique bay panes have no horizontal siding courses; retain their
  // measured boxes instead of widening an axis-aligned cut across a slant.
  const openings = panes.boxes.filter(box => !isDoorPoint(box.min.map((v, i) => (v + box.max[i]) / 2))).map(box => {
    const axis = box.max[0] - box.min[0] < .15 ? 0 : box.max[2] - box.min[2] < .15 ? 2 : null;
    if (axis === null) return box;
    const min = [...box.min], max = [...box.max]; min[axis] -= .25; max[axis] += .25;
    return { min, max };
  });
  // Overlap the interior hollow behind the door reveal. A centimetre gap
  // would otherwise leave siding-course caps visible across the open doorway.
  openings.push({ min: [19.5962, .4003, -13.0], max: [20.5169, 2.431, -12.60] });
  openings.push({ min: [22.70, .399, -17.3001], max: [23.40, 2.431, -16.3999] });
  const changed = new Set<Mesh>();
  let removedTriangles = 0, addedTriangles = 0, cavityRemovedTriangles = 0, bayConnectionRemovedTriangles = 0, garageGateBackingRemovedTriangles = 0;
  function record(mesh: Mesh, result: { removedTriangles: number; addedTriangles: number }) {
    if (result.removedTriangles) changed.add(mesh);
    removedTriangles += result.removedTriangles; addedTriangles += result.addedTriangles;
    return result.removedTriangles;
  }
  // The old display-only shell uses solid boxes for every siding course and
  // for its horizontal cream belt. Their broad top/bottom faces pass through
  // the furnished rooms. Hollow only behind the A01 inner plaster faces,
  // keeping the complete street-facing siding, trim rims and authored UVs.
  const cavities: Box[] = [
    { min: [15.55, .399, -18.79], max: [22.91, 5.621, -12.85] },
    { min: [23.05, .159, -18.31], max: [26.61, 2.671, -13.32] },
  ];
  for (const mesh of host.filter(mesh => / · (SidingBlue|Cream)\./.test(mesh.name))) {
    cavityRemovedTriangles += record(mesh, subtractHostGeometryBoxes(mesh, cavities, originX));
    if (/ · Cream\./.test(mesh.name)) record(mesh, subtractHostGeometryBoxes(mesh, [openings[openings.length - 1]], originX));
  }
  for (const mesh of host.filter(mesh => / · SidingBlue\./.test(mesh.name))) {
    // The main box and the rear wall of the bay used to close the connection
    // behind the decorative projection. Restrict this cut to those original
    // Z-parallel planes: the angled exterior bay cheeks and its roof stay.
    const bridge = { min: [15.90, .399, -12.90], max: [18.33, 2.49, -12.70] };
    bayConnectionRemovedTriangles += record(mesh, subtractHostGeometryBoxes(mesh, [bridge], originX,
      points => [-12.7465, -12.7229, -12.86452].some(z => points.every(point => Math.abs(point[2] - z) < .001))));
    record(mesh, subtractHostGeometryBoxes(mesh, openings, originX));
    // The closed cream garage gate is already authored in front of the old
    // blue display box. Clear only that box behind the original leaf so its
    // inside face is visible. The gate, panels, frame and collision stay shut.
    const gateReveal = { min: [23.4791, .1595, -13.40], max: [26.3117, 2.2841, -13.0] };
    garageGateBackingRemovedTriangles += record(mesh, subtractHostGeometryBoxes(mesh, [gateReveal], originX));
  }
  const changedMeshes = changed.size;
  if (pane.material instanceof PBRMaterial) {
    const glass = pane.material.clone('Daniel e Helen · vidro da fachada original');
    if (glass) {
      glass.alpha = .14; glass.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
      glass.backFaceCulling = false; glass.disableDepthWrite = true;
      pane.material = glass; pane.metadata = { ...pane.metadata, hostHouseGlass: true, castShadow: false };
      ownMaterials.push(glass);
    }
  }
  for (const source of host.filter(mesh => / · (PaintRed|Gold|WindowGlow)\./.test(mesh.name))) {
    const measured = paneBounds(source, originX).source, indices = source.getIndices()!;
    const door: number[] = [], rest: number[] = [];
    for (let i = 0; i < indices.length; i += 3) {
      const ids = [indices[i], indices[i + 1], indices[i + 2]];
      (ids.every(id => isDoorPoint(measured[id])) ? door : rest).push(...ids);
    }
    if (!door.length) continue;
    const leaf = new Mesh(source.name + ' · folha original móvel', source.getScene()), remap = new Map<number, number>();
    const compactIndices = door.map(id => { if (!remap.has(id)) remap.set(id, remap.size); return remap.get(id)!; });
    for (const kind of source.getVerticesDataKinds()) {
      const buffer = source.getVerticesData(kind)!, size = source.getVertexBuffer(kind)!.getSize(), values: number[] = [];
      for (const id of remap.keys()) values.push(...Array.from(buffer).slice(id * size, (id + 1) * size));
      leaf.setVerticesData(kind, values, false, size);
    }
    leaf.setIndices(compactIndices); leaf.parent = hinge;
    leaf.position.copyFrom(source.position).subtractInPlace(hinge.position);
    leaf.scaling.copyFrom(source.scaling); leaf.rotation.copyFrom(source.rotation);
    leaf.rotationQuaternion = source.rotationQuaternion?.clone() ?? null;
    leaf.material = source.material; leaf.isPickable = true;
    leaf.metadata = { ...source.metadata, hostFrontDoor: true };
    source.setIndices(rest); source.refreshBoundingInfo(); frontDoorMeshes.push(leaf);
  }
  return { frontDoorMeshes, ownMaterials,
    setFrontDoorOpen(value: boolean) {
      // The furnished hall has its clear route immediately behind the left
      // jamb. Swing onto the existing porch to preserve that authored route.
      frontDoorOpen = value; hinge.rotation.y = value ? -Math.PI / 2 : 0;
      hinge.computeWorldMatrix(true);
      for (const mesh of frontDoorMeshes) mesh.computeWorldMatrix(true);
    },
    get frontDoorOpen() { return frontDoorOpen; },
    get frontDoorCollider(): (Obstacle & { minY: number; maxY: number }) | null {
      if (!frontDoorMeshes.length) return null;
      hinge.computeWorldMatrix(true);
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (const mesh of frontDoorMeshes) {
        mesh.computeWorldMatrix(true);
        const box = mesh.getBoundingInfo().boundingBox;
        for (const [i, axis] of ['x', 'y', 'z'].entries()) {
          min[i] = Math.min(min[i], box.minimumWorld[axis as 'x' | 'y' | 'z']);
          max[i] = Math.max(max[i], box.maximumWorld[axis as 'x' | 'y' | 'z']);
        }
      }
      return { x: (min[0] + max[0]) / 2, z: (min[2] + max[2]) / 2,
        halfWidth: (max[0] - min[0]) / 2, halfDepth: (max[2] - min[2]) / 2, minY: min[1], maxY: max[1] };
    },
    diagnostics: { version: 'host-openings-a01-5', changedMeshes, removedTriangles, addedTriangles,
      cavityRemovedTriangles, bayConnectionRemovedTriangles, garageGateBackingRemovedTriangles,
      windowOpenings: openings.length - 2, windowNormalDepthPadding: .25, obliquePaneBoundsPreserved: true, doorOpenings: 2, sourceFilePreserved: true,
      framesPreserved: true, roofsPreserved: true, otherHousesPreserved: true },
  };
}
