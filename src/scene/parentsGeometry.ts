import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';

export type V3 = { x: number; y: number; z: number };
export type BodyRing = { y: number; width: number; front: number; back?: number; x?: number; z?: number; pleat?: number; flatten?: number };
type Batch = { positions: number[]; indices: number[]; uvs: number[]; details: string[] };

/** Character surfaces are authored cross sections, not a pile of primitive
 * boxes. Each articulated part becomes one mesh per material, in joint-local
 * space, so an idle gesture never loses its pivot when geometry is batched. */
export class ParentPart {
  private batches = new Map<StandardMaterial, Batch>();
  readonly node: TransformNode;
  constructor(node: TransformNode) { this.node = node; }

  geometry(name: string, positions: number[], indices: number[], material: StandardMaterial, uvs?: number[]) {
    let batch = this.batches.get(material);
    if (!batch) { batch = { positions: [], indices: [], uvs: [], details: [] }; this.batches.set(material, batch); }
    const offset = batch.positions.length / 3;
    batch.positions.push(...positions); batch.indices.push(...indices.map(i => i + offset));
    batch.uvs.push(...(uvs ?? positions.flatMap((_, i) => i % 3 === 0 ? [positions[i] * 2, positions[i + 1] * 2] : [])));
    batch.details.push(name);
  }

  loft(name: string, rings: BodyRing[], material: StandardMaterial, sides = 12, uOffset = 0,
    vRange?: { min: number; max: number }, caps = { bottom: true, top: true }) {
    const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
    const low = vRange?.min ?? rings[0].y;
    const range = Math.max(.001, (vRange?.max ?? rings.at(-1)!.y) - low);
    for (const ring of rings) for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2, forward = Math.cos(a);
      const wave = 1 + (ring.pleat ?? 0) * Math.cos(a * 8);
      const facialFront = forward >= 0 ? Math.pow(forward, ring.flatten ?? 1) * ring.front : forward * (ring.back ?? ring.front);
      positions.push((ring.x ?? 0) + Math.sin(a) * ring.width * wave, ring.y, (ring.z ?? 0) + facialFront * wave);
      uvs.push(j / sides + uOffset, (ring.y - low) / range);
    }
    for (let row = 0; row < rings.length - 1; row++) for (let j = 0; j < sides; j++) {
      const a = row * (sides + 1) + j, b = a + 1, c = a + sides + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
    for (const row of [0, rings.length - 1]) {
      if (row === 0 ? !caps.bottom : !caps.top) continue;
      const ring = rings[row], center = positions.length / 3;
      positions.push(ring.x ?? 0, ring.y, ring.z ?? 0); uvs.push(.5, row === 0 ? 0 : 1);
      for (let j = 0; j < sides; j++) {
        const a = row * (sides + 1) + j;
        if (row === 0) indices.push(center, a, a + 1);
        else indices.push(center, a + 1, a);
      }
    }
    this.geometry(name, positions, indices, material, uvs);
  }

  tube(name: string, path: (V3 & { width: number; depth?: number })[], material: StandardMaterial, sides = 8) {
    const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
    for (let row = 0; row < path.length; row++) {
      const p = path[row], previous = path[Math.max(0, row - 1)], next = path[Math.min(path.length - 1, row + 1)];
      const axis = new Vector3(next.x - previous.x, next.y - previous.y, next.z - previous.z).normalize();
      const across = Math.abs(axis.z) > .93 ? Vector3.Cross(axis, Vector3.Up()).normalize()
        : Vector3.Cross(axis, Vector3.Forward()).normalize();
      const forward = Vector3.Cross(across, axis).normalize();
      for (let j = 0; j <= sides; j++) {
        const angle = j / sides * Math.PI * 2;
        const offset = across.scale(Math.sin(angle) * p.width).add(forward.scale(Math.cos(angle) * (p.depth ?? p.width)));
        positions.push(p.x + offset.x, p.y + offset.y, p.z + offset.z);
        uvs.push(j / sides, row / (path.length - 1));
      }
    }
    for (let row = 0; row < path.length - 1; row++) for (let j = 0; j < sides; j++) {
      const a = row * (sides + 1) + j, b = a + 1, c = a + sides + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
    for (const row of [0, path.length - 1]) {
      const p = path[row], center = positions.length / 3;
      positions.push(p.x, p.y, p.z); uvs.push(.5, row === 0 ? 0 : 1);
      for (let j = 0; j < sides; j++) {
        const a = row * (sides + 1) + j;
        if (row === 0) indices.push(center, a, a + 1);
        else indices.push(center, a + 1, a);
      }
    }
    this.geometry(name, positions, indices, material, uvs);
  }

  oval(name: string, center: V3, width: number, height: number, material: StandardMaterial, bulge = 0, sides = 12) {
    const positions = [center.x, center.y, center.z + bulge], indices: number[] = [], uvs = [.5, .5];
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2;
      positions.push(center.x + Math.sin(a) * width, center.y + Math.cos(a) * height, center.z);
      uvs.push(.5 + Math.sin(a) * .5, .5 + Math.cos(a) * .5);
      if (j < sides) indices.push(0, j + 1, j + 2);
    }
    this.geometry(name, positions, indices, material, uvs);
  }

  polygon(name: string, points: V3[], material: StandardMaterial) {
    const positions = points.flatMap(p => [p.x, p.y, p.z]), indices: number[] = [];
    for (let i = 1; i < points.length - 1; i++) indices.push(0, i + 1, i);
    // Orient the visible, gently folded facial/clothing panel toward local +Z.
    const normals: number[] = []; VertexData.ComputeNormals(positions, indices, normals);
    if (normals[2] < 0) for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    this.geometry(name, positions, indices, material);
  }

  solid(name: string, vertices: V3[], faces: number[][], material: StandardMaterial) {
    const positions: number[] = [], indices: number[] = [];
    const center = vertices.reduce<Vector3>((sum, p) => sum.add(new Vector3(p.x, p.y, p.z)), Vector3.Zero()).scale(1 / vertices.length);
    for (const face of faces) {
      const offset = positions.length / 3, points = face.map(i => vertices[i]);
      positions.push(...points.flatMap(p => [p.x, p.y, p.z]));
      for (let j = 1; j < face.length - 1; j++) {
        const a = points[0], b = points[j], c = points[j + 1];
        const normal = Vector3.Cross(new Vector3(a.x - b.x, a.y - b.y, a.z - b.z),
          new Vector3(c.x - b.x, c.y - b.y, c.z - b.z));
        const outside = new Vector3((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3).subtract(center);
        if (Vector3.Dot(normal, outside) >= 0) indices.push(offset, offset + j, offset + j + 1);
        else indices.push(offset, offset + j + 1, offset + j);
      }
    }
    this.geometry(name, positions, indices, material);
  }

  build(): Mesh[] {
    const meshes: Mesh[] = [];
    for (const [material, batch] of this.batches) {
      const mesh = new Mesh(this.node.name + ' · ' + material.name, this.node.getScene()), data = new VertexData(), normals: number[] = [];
      VertexData.ComputeNormals(batch.positions, batch.indices, normals);
      data.positions = batch.positions; data.indices = batch.indices; data.normals = normals; data.uvs = batch.uvs;
      data.applyToMesh(mesh); mesh.material = material; mesh.parent = this.node;
      mesh.isPickable = true; mesh.receiveShadows = true;
      mesh.metadata = { character: true, interactionId: 'parents', castShadow: true, authoredDetails: batch.details };
      meshes.push(mesh);
    }
    return meshes;
  }
}
