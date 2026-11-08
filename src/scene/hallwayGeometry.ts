import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { HomeGeometry } from './props';

/** Small authored construction tools. Geometry is local until positioned;
 * texture coordinates measure metres before static material batching. */
export class HallwayGeometry extends HomeGeometry {
  constructor(scene: Scene) { super(scene); }
  metric(mesh: Mesh, scale = 1) {
    const p = mesh.getVerticesData('position')!, n = mesh.getVerticesData('normal')!, uv: number[] = [];
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i] + mesh.position.x, y = p[i + 1] + mesh.position.y, z = p[i + 2] + mesh.position.z;
      if (Math.abs(n[i + 1]) > .7) uv.push(x * scale, z * scale);
      else if (Math.abs(n[i]) > .7) uv.push(z * scale, y * scale);
      else uv.push(x * scale, y * scale);
    }
    mesh.setVerticesData('uv', uv); return mesh;
  }
  board(name: string, w: number, h: number, d: number, x: number, y: number, z: number,
    material: StandardMaterial, target?: string, scale = 1.25) {
    return this.metric(this.box(name, w, h, d, x, y, z, material, target), scale);
  }
  bevel(name: string, w: number, h: number, d: number, x: number, y: number, z: number,
    material: StandardMaterial, cut = .012, target?: string) {
    const mesh = new Mesh(name, this.scene), positions: number[] = [], uv: number[] = [], indices: number[] = [], normals: number[] = [];
    const r = Math.min(cut, w / 5, h / 5, d / 5), ys = [-h / 2, -h / 2 + r, h / 2 - r, h / 2];
    const ring = (inset: number) => {
      const xx = w / 2 - inset, zz = d / 2 - inset, corner = Math.min(r, xx / 3, zz / 3);
      return [[-xx + corner, -zz], [xx - corner, -zz], [xx, -zz + corner], [xx, zz - corner],
        [xx - corner, zz], [-xx + corner, zz], [-xx, zz - corner], [-xx, -zz + corner]];
    };
    for (let row = 0; row < 4; row++) for (const [xx, zz] of ring(row === 0 || row === 3 ? r : 0)) {
      positions.push(xx, ys[row], zz); uv.push((xx + w / 2) / Math.max(w, .01), (ys[row] + h / 2) / Math.max(h, .01));
    }
    for (let row = 0; row < 3; row++) for (let j = 0; j < 8; j++) {
      const a = row * 8 + j, b = row * 8 + (j + 1) % 8, c = a + 8, d = b + 8;
      indices.push(a, b, c, b, d, c);
    }
    for (const top of [false, true]) {
      const center = positions.length / 3, yy = (top ? 1 : -1) * h / 2;
      positions.push(0, yy, 0); uv.push(.5, .5);
      for (const [xx, zz] of ring(r)) { positions.push(xx, yy, zz); uv.push(xx / w + .5, zz / d + .5); }
      for (let j = 0; j < 8; j++) {
        const a = center + 1 + j, b = center + 1 + (j + 1) % 8;
        indices.push(center, top ? a : b, top ? b : a);
      }
    }
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uv; data.applyToMesh(mesh);
    mesh.position.set(x, y, z); return this.add(mesh, material, target);
  }
  lathe(name: string, profile: readonly (readonly [number, number])[], x: number, y: number, z: number,
    material: StandardMaterial, sides = 10) {
    const mesh = new Mesh(name, this.scene), positions: number[] = [], uv: number[] = [], indices: number[] = [], normals: number[] = [];
    for (const [radius, yy] of profile) for (let j = 0; j <= sides; j++) {
      const angle = j / sides * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, yy, Math.sin(angle) * radius); uv.push(j / sides, yy / .5);
    }
    for (let row = 0; row < profile.length - 1; row++) for (let j = 0; j < sides; j++) {
      const a = row * (sides + 1) + j, b = a + 1, c = a + sides + 1, d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uv; data.applyToMesh(mesh);
    mesh.position.set(x, y, z); return this.add(mesh, material);
  }
  leaf(name: string, x: number, y: number, z: number, length: number, width: number,
    yaw: number, tilt: number, material: StandardMaterial) {
    const mesh = new Mesh(name, this.scene), positions = [0, -length / 2, 0, -width / 2, 0, -.012, 0, length / 2, 0, width / 2, 0, -.012, 0, 0, .015];
    const indices = [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4], normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = [.5, 0, 0, .5, .5, 1, 1, .5, .5, .5]; data.applyToMesh(mesh);
    mesh.position.set(x, y, z); mesh.rotation.set(tilt, yaw, 0);
    material.backFaceCulling = false; material.twoSidedLighting = true;
    return this.add(mesh, material, undefined, false);
  }
}
