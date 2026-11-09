import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const bytes = readFileSync(new URL('../public/models/pai_intercambio.glb', import.meta.url));
function readGlb() {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2); assert.equal(bytes.readUInt32LE(8), bytes.length);
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    assert.equal(length % 4, 0); assert.ok(offset + 8 + length <= bytes.length);
    chunks.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length) }); offset += 8 + length;
  }
  assert.equal(chunks[0].type, 0x4e4f534a); assert.equal(chunks[1].type, 0x004e4942);
  return { gltf: JSON.parse(chunks[0].data.toString('utf8')), binary: chunks[1].data };
}
function values(gltf, binary, index) {
  const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView];
  const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const formats = { 5121: [1, 'readUInt8', 255], 5123: [2, 'readUInt16LE', 65535],
    5125: [4, 'readUInt32LE', 4294967295], 5126: [4, 'readFloatLE', 1] };
  const [size, method, maximum] = formats[a.componentType], width = widths[a.type];
  assert.ok(width && size && !a.sparse, 'the supplied dense accessor can be read');
  const start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0), stride = view.byteStride ?? width * size;
  assert.ok(start + (a.count - 1) * stride + width * size <= binary.length);
  return Array.from({ length: a.count }, (_, row) => Array.from({ length: width }, (_, column) =>
    binary[method](start + row * stride + column * size) / (a.normalized ? maximum : 1)));
}

test('pai GLB: novo arquivo autocontido preserva suas três texturas JPEG', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    '7811eed141e6341ecdd32945a993f3ce1fe678d2d8fe9c5d085896c75c3d91d4');
  const { gltf, binary } = readGlb();
  assert.equal(gltf.asset.version, '2.0'); assert.equal(gltf.buffers.length, 1);
  assert.equal(gltf.buffers[0].uri, undefined);
  assert.ok(binary.length >= gltf.buffers[0].byteLength && binary.length - gltf.buffers[0].byteLength < 4);
  assert.equal(gltf.materials.length, 1); assert.equal(gltf.images.length, 3);
  for (const image of gltf.images) {
    assert.equal(image.uri, undefined); assert.equal(image.mimeType, 'image/jpeg');
    const view = gltf.bufferViews[image.bufferView], start = view.byteOffset ?? 0;
    assert.equal(view.buffer, 0); assert.ok(view.byteLength > 8 && start + view.byteLength <= binary.length);
    assert.deepEqual([...binary.subarray(start, start + 2)], [255, 216]);
  }
});

test('pai GLB: poses fornecidas possuem esqueleto, pesos e geometria válidos, sem morphs inventados', () => {
  const { gltf, binary } = readGlb();
  assert.deepEqual(gltf.animations.map(a => a.name), ['Pose_EmPe', 'Pose_Sentado_Mesa', 'Pose_Dirigindo']);
  assert.equal(gltf.skins.length, 1);
  const skin = gltf.skins[0], joints = new Set(skin.joints.map(i => gltf.nodes[i].name));
  for (const name of ['Hips', 'Head', 'Hand.L', 'Hand.R', 'Foot.L', 'Foot.R']) assert.ok(joints.has(name));
  assert.equal(gltf.accessors[skin.inverseBindMatrices].count, skin.joints.length);
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    assert.equal(primitive.targets?.length ?? 0, 0, 'this file supplies no facial morph targets');
    const positions = values(gltf, binary, primitive.attributes.POSITION);
    const weights = values(gltf, binary, primitive.attributes.WEIGHTS_0);
    const indices = values(gltf, binary, primitive.attributes.JOINTS_0);
    assert.ok(positions.length > 0 && positions.length < 250000, 'the replacement is not the earlier two-million-triangle static export');
    assert.equal(weights.length, positions.length); assert.equal(indices.length, positions.length);
    for (let vertex = 0; vertex < positions.length; vertex++) {
      assert.ok(positions[vertex].every(Number.isFinite));
      assert.ok(weights[vertex].every(w => Number.isFinite(w) && w >= 0 && w <= 1.00001));
      assert.ok(Math.abs(weights[vertex].reduce((a, b) => a + b, 0) - 1) < .001);
      assert.ok(indices[vertex].every(j => Number.isInteger(j) && j >= 0 && j < skin.joints.length));
    }
    for (const [index] of values(gltf, binary, primitive.indices)) assert.ok(index < positions.length);
  }
  for (const animation of gltf.animations) {
    assert.ok(animation.channels.length > 0 && animation.samplers.length > 0);
    for (const channel of animation.channels) {
      assert.ok(gltf.nodes[channel.target.node]); const sampler = animation.samplers[channel.sampler]; assert.ok(sampler);
      const times = values(gltf, binary, sampler.input).flat();
      assert.ok(times.every((time, i) => Number.isFinite(time) && (i === 0 || time >= times[i - 1])));
      assert.equal(gltf.accessors[sampler.output].count, times.length);
    }
  }
});
