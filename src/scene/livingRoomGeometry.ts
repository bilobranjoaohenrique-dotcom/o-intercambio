import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HallwayGeometry } from './hallwayGeometry';

/** Room-specific authored mesh tools. Upholstery is a rounded, subdivided
 * volume with metric UVs, rather than a pile of unmodified primitive boxes. */
export class LivingRoomGeometry extends HallwayGeometry {
  readonly groups: TransformNode[] = [];
  constructor(scene: Scene) { super(scene); }

  group(name: string, x: number, y: number, z: number, yaw: number, build: () => void) {
    const first = this.meshes.length;
    build();
    const node = new TransformNode(name, this.scene);
    node.position.set(x, y, z); node.rotation.y = yaw;
    for (const mesh of this.meshes.slice(first)) mesh.parent = node;
    this.groups.push(node);
  }

  cushion(name: string, w: number, h: number, d: number, x: number, y: number, z: number,
    material: StandardMaterial, radius = .055, target?: string) {
    const mesh = new Mesh(name, this.scene), positions: number[] = [], normals: number[] = [], uv: number[] = [], indices: number[] = [];
    const half = [w / 2, h / 2, d / 2], r = Math.min(radius, ...half.map(a => a * .85));
    const segments = 6;
    for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
      const base = positions.length / 3, uAxis = (axis + 1) % 3, vAxis = (axis + 2) % 3;
      for (let row = 0; row <= segments; row++) for (let col = 0; col <= segments; col++) {
        const p = [0, 0, 0]; p[axis] = sign * half[axis]; p[uAxis] = (col / segments * 2 - 1) * half[uAxis]; p[vAxis] = (row / segments * 2 - 1) * half[vAxis];
        const inner = p.map((a, i) => Math.max(-half[i] + r, Math.min(half[i] - r, a)));
        const delta = p.map((a, i) => a - inner[i]), length = Math.hypot(...delta);
        const q = inner.map((a, i) => a + delta[i] / length * r);
        // Slight convex pad crown and asymmetric hand-sewn compression.
        const crown = Math.sin(col / segments * Math.PI) * Math.sin(row / segments * Math.PI);
        q[axis] += sign * crown * r * .14;
        positions.push(q[0], q[1], q[2]);
        const fullArt = material.name.includes('almofada creme');
        uv.push(fullArt ? q[uAxis] / (half[uAxis] * 2) + .5 : q[uAxis] / .32,
          fullArt ? q[vAxis] / (half[vAxis] * 2) + .5 : q[vAxis] / .32);
      }
      for (let row = 0; row < segments; row++) for (let col = 0; col < segments; col++) {
        const a = base + row * (segments + 1) + col, b = a + 1, c = a + segments + 1, dd = c + 1;
        // Babylon's left-handed ComputeNormals convention reverses the
        // usual right-handed cross product. Keep every outer face outward.
        if (sign > 0) indices.push(a, c, b, b, c, dd); else indices.push(a, b, c, b, dd, c);
      }
    }
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uv; data.applyToMesh(mesh);
    mesh.position.set(x, y, z); return this.add(mesh, material, target);
  }

  tube(name: string, path: Vector3[], radius: number, material: StandardMaterial, target?: string, sides = 5) {
    return this.add(MeshBuilder.CreateTube(name, { path, radius, tessellation: sides, cap: Mesh.CAP_ALL }, this.scene), material, target);
  }

  /** Centimetre-sized flower parts occupy only a few screen pixels. A base
   * icosahedron keeps their flat low-poly shading at 1/20 of the old vertices.
   * Its radius normalises the base solid's .850650808 bounds to unit size. */
  flowerPart(name: string, w: number, h: number, d: number, x: number, y: number, z: number, material: StandardMaterial) {
    const mesh = MeshBuilder.CreateIcoSphere(name, { radius: .5877852523, subdivisions: 1, flat: true }, this.scene);
    mesh.scaling.set(w, h, d); mesh.position.set(x, y, z);
    return this.add(mesh, material);
  }

  piping(name: string, w: number, d: number, x: number, y: number, z: number, material: StandardMaterial) {
    const path: Vector3[] = [], rr = Math.min(.035, w * .1, d * .1);
    for (let corner = 0; corner < 4; corner++) {
      const a0 = corner * Math.PI / 2, cx = Math.cos(a0 + Math.PI / 4) > 0 ? w / 2 - rr : -w / 2 + rr;
      const cz = Math.sin(a0 + Math.PI / 4) > 0 ? d / 2 - rr : -d / 2 + rr;
      for (let i = 0; i <= 4; i++) { const a = a0 + i / 4 * Math.PI / 2; path.push(new Vector3(x + cx + Math.cos(a) * rr, y, z + cz + Math.sin(a) * rr)); }
    }
    path.push(path[0].clone()); return this.tube(name, path, .0023, material, undefined, 4);
  }
}
