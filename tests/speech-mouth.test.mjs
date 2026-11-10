import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const { buildSpeechMouthPositions } = await import('../src/scene/speechMouth.ts');

const assets = [
  { role: 'father', file: 'pai_intercambio.glb', hash: '7811eed141e6341ecdd32945a993f3ce1fe678d2d8fe9c5d085896c75c3d91d4' },
  { role: 'mother', file: 'mae_intercambio.glb', hash: '959f4cfdb2deaa500fc11df39a5de90f585d5e454a8b3b4ea3babc8880454a3e' },
];
function positions(asset) {
  const bytes = readFileSync(new URL('../public/models/' + asset.file, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.hash, 'the supplied GLB stays intact');
  const jsonLength = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const binaryStart = 20 + jsonLength + 8;
  const accessor = gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION];
  const view = gltf.bufferViews[accessor.bufferView];
  assert.equal(accessor.type, 'VEC3'); assert.equal(accessor.componentType, 5126);
  const result = new Float32Array(accessor.count * 3), stride = view.byteStride ?? 12;
  for (let index = 0; index < accessor.count; index++) for (let axis = 0; axis < 3; axis++)
    result[index * 3 + axis] = bytes.readFloatLE(binaryStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + index * stride + axis * 4);
  return result;
}

for (const asset of assets) test(`speech mouth: ${asset.role} has a bounded local deformation without changing the rest of the face/body`, () => {
  const base = positions(asset), before = base.slice(), result = buildSpeechMouthPositions(base, asset.role);
  assert.deepEqual(base, before, 'preparing the shape does not rewrite the closed mesh');
  assert.ok(result.positions instanceof Float32Array); assert.equal(result.positions.length, base.length);
  let count = 0, largest = 0;
  for (let offset = 0; offset < base.length; offset += 3) {
    const x = base[offset], y = base[offset + 1], z = base[offset + 2];
    const delta = Math.hypot(result.positions[offset] - x, result.positions[offset + 1] - y, result.positions[offset + 2] - z);
    assert.ok(Number.isFinite(delta), 'all target coordinates are finite');
    if (delta > 1e-7) {
      count++; largest = Math.max(largest, delta);
      // Broad anatomical guardrails, independent of the mask's exact curve:
      // no eyes/hair, neck/body, ears, or back of the head may move.
      assert.ok(y > 1.40 && y < 1.70 && Math.abs(x) < .16 && z > .03,
        `deformation escaped the lower front face at ${JSON.stringify({ x, y, z, delta })}`);
    }
  }
  assert.ok(count >= 8 && count < base.length / 30, `localized affected vertex count: ${count}`);
  assert.equal(count, result.affectedVertices);
  assert.ok(largest >= .001 && largest <= .035, `mouth displacement remains anatomically small: ${largest}`);
  assert.ok(Number.isFinite(result.maxDisplacement) && result.maxDisplacement > 0 && result.maxDisplacement <= .035);
});

test('speech mouth: coincident vertices on texture seams receive identical displacements', () => {
  for (const asset of assets) {
    const base = positions(asset), first = buildSpeechMouthPositions(base, asset.role);
    let offset = -1;
    for (let index = 0; index < base.length; index += 3) {
      if (Math.hypot(first.positions[index] - base[index], first.positions[index + 1] - base[index + 1],
        first.positions[index + 2] - base[index + 2]) > .001) { offset = index; break; }
    }
    assert.ok(offset >= 0, 'a real lip/jaw vertex must move');
    const duplicated = new Float32Array(base.length + 3); duplicated.set(base); duplicated.set(base.subarray(offset, offset + 3), base.length);
    const second = buildSpeechMouthPositions(duplicated, asset.role);
    assert.deepEqual([...second.positions.subarray(offset, offset + 3)], [...second.positions.subarray(base.length)],
      'a UV seam cannot split open because of different spatial mouth weights');
  }
});
