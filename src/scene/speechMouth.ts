import type { FloatArray } from '@babylonjs/core/types';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { MorphTarget } from '@babylonjs/core/Morph/morphTarget';
import { MorphTargetManager } from '@babylonjs/core/Morph/morphTargetManager';

export type SpeechMouthRole = 'father' | 'mother';
type Profile = { centerY: number; centerZ: number; hingeZ: number; lowerY: number;
  fullLowerY: number; frontStart: number; frontFull: number };
const PROFILES: Record<SpeechMouthRole, Readonly<Profile>> = {
  father: Object.freeze({ centerY: 1.585, centerZ: .1153, hingeZ: .04,
    lowerY: 1.530, fullLowerY: 1.553, frontStart: .065, frontFull: .105 }),
  mother: Object.freeze({ centerY: 1.565, centerZ: .1265, hingeZ: .045,
    lowerY: 1.515, fullLowerY: 1.540, frontStart: .075, frontFull: .115 }),
};
const OPEN_ANGLE = .14;
const smooth = (from: number, to: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** POSITION-based weights keep UV seam duplicates together. The lower lip
 * and chin rotate a few millimetres while the upper face stays untouched. */
export function buildSpeechMouthPositions(base: FloatArray, role: SpeechMouthRole) {
  if (base.length % 3) throw new Error('A malha da boca precisa de posições XYZ completas.');
  const profile = PROFILES[role], positions = new Float32Array(base);
  const hingeY = profile.centerY + .003, c = Math.cos(OPEN_ANGLE), s = Math.sin(OPEN_ANGLE);
  const region = Object.freeze({ coordinateSpace: 'mesh-bind', role,
    center: Object.freeze({ x: 0, y: profile.centerY, z: profile.centerZ }),
    horizontalRadius: .065, lowerY: profile.lowerY, upperY: profile.centerY + .002,
    frontStartZ: profile.frontStart, frontFullZ: profile.frontFull,
    hinge: Object.freeze({ x: 0, y: hingeY, z: profile.hingeZ }), angleRadians: OPEN_ANGLE });
  let affectedVertices = 0, maxDisplacement = 0;
  for (let index = 0; index < base.length; index += 3) {
    const x = base[index], y = base[index + 1], z = base[index + 2];
    const weight = (1 - smooth(.028, region.horizontalRadius, Math.abs(x))) *
      smooth(profile.lowerY, profile.fullLowerY, y) *
      (1 - smooth(profile.centerY - .001, region.upperY, y)) *
      smooth(profile.frontStart, profile.frontFull, z);
    if (weight <= .0000001) continue;
    const dy = y - hingeY, dz = z - profile.hingeZ;
    positions[index + 1] = y + (hingeY + dy * c - dz * s - y) * weight;
    positions[index + 2] = z + (profile.hingeZ + dy * s + dz * c - z) * weight;
    const displacement = Math.hypot(positions[index + 1] - y, positions[index + 2] - z);
    if (displacement > 0) { affectedVertices++; maxDisplacement = Math.max(maxDisplacement, displacement); }
  }
  return { positions, affectedVertices, maxDisplacement, region };
}

/** Adds one lightweight runtime target. Embedded GLB data and the mesh's
 * base buffers remain intact; existing authored JawOpen targets are reused. */
export function createSpeechMouth(mesh: Mesh, role: SpeechMouthRole) {
  const base = mesh.getVerticesData(VertexBuffer.PositionKind);
  if (!base?.length) throw new Error('Não foi possível localizar a geometria da boca.');
  const built = buildSpeechMouthPositions(base, role);
  const createdManager = !mesh.morphTargetManager;
  const manager = mesh.morphTargetManager ?? new MorphTargetManager(mesh.getScene());
  manager.optimizeInfluencers = false;
  manager.numMaxInfluencers = Math.max(1, manager.numMaxInfluencers);
  if (createdManager) mesh.morphTargetManager = manager;
  let target: MorphTarget | undefined;
  for (let index = 0; index < manager.numTargets; index++) {
    const candidate = manager.getTarget(index);
    if (/jawopen/i.test(candidate.name)) { target = candidate; break; }
  }
  const createdTarget = !target;
  if (!target) {
    target = new MorphTarget('JawOpen', 0, mesh.getScene());
    target.setPositions(built.positions);
    const baseNormals = mesh.getVerticesData(VertexBuffer.NormalKind), indices = mesh.getIndices();
    if (baseNormals && indices) {
      const recalculated: number[] = [], normals = new Float32Array(baseNormals);
      VertexData.ComputeNormals(built.positions, indices, recalculated);
      for (let index = 0; index < base.length; index += 3) {
        if (built.positions[index] === base[index] && built.positions[index + 1] === base[index + 1] &&
          built.positions[index + 2] === base[index + 2]) continue;
        // glTF's raw winding and Babylon-authored meshes may use opposite
        // conventions. A small jaw movement must keep the original hemisphere.
        const sign = recalculated[index] * baseNormals[index] + recalculated[index + 1] * baseNormals[index + 1] +
          recalculated[index + 2] * baseNormals[index + 2] < 0 ? -1 : 1;
        normals[index] = recalculated[index] * sign; normals[index + 1] = recalculated[index + 1] * sign;
        normals[index + 2] = recalculated[index + 2] * sign;
      }
      target.setNormals(normals);
    }
    manager.addTarget(target);
  }
  manager.numMaxInfluencers = Math.max(manager.numMaxInfluencers, manager.numTargets, 1);
  const metrics = { method: createdTarget ? 'localized-jaw-morph' : 'authored-jaw-morph', role,
    affectedVertices: built.affectedVertices, maxDisplacement: built.maxDisplacement, region: built.region };
  const previousMetadata = mesh.metadata?.speechMouth;
  mesh.metadata = { ...mesh.metadata, speechMouth: metrics };
  let disposed = false;
  return {
    get diagnostics() { return { ...metrics, influence: target!.influence,
      currentDisplacement: built.maxDisplacement * target!.influence }; },
    dispose() {
      if (disposed) return; disposed = true;
      if (createdTarget) manager.removeTarget(target!);
      if (createdManager) {
        if (mesh.morphTargetManager === manager) mesh.morphTargetManager = null;
        manager.dispose();
      }
      if (mesh.metadata?.speechMouth === metrics) {
        if (previousMetadata === undefined) delete mesh.metadata.speechMouth;
        else mesh.metadata.speechMouth = previousMetadata;
      }
    },
  };
}
