import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const bytes = readFileSync(new URL('../public/models/pai_intercambio.glb', import.meta.url));
function readGlb() {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'glTF binary header');
  assert.equal(bytes.readUInt32LE(4), 2); assert.equal(bytes.readUInt32LE(8), bytes.length);
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    assert.equal(length % 4, 0); assert.ok(offset + 8 + length <= bytes.length);
    chunks.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  assert.equal(chunks[0].type, 0x4e4f534a); assert.equal(chunks[1].type, 0x004e4942);
  return { gltf: JSON.parse(chunks[0].data.toString('utf8')), binary: chunks[1].data };
}

test('pai GLB: arquivo final correto é autocontido com oito imagens PNG válidas', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    '603a2d7bb088efe778ab5775d8fcfc50aa9a4fca2384a4ea06afec4715bdba70');
  const { gltf, binary } = readGlb();
  assert.equal(gltf.asset.version, '2.0'); assert.equal(gltf.buffers.length, 1);
  assert.equal(gltf.buffers[0].uri, undefined);
  assert.ok(binary.length >= gltf.buffers[0].byteLength && binary.length - gltf.buffers[0].byteLength < 4);
  assert.equal(gltf.images.length, 8);
  for (const image of gltf.images) {
    assert.equal(image.uri, undefined); assert.equal(image.mimeType, 'image/png');
    const view = gltf.bufferViews[image.bufferView]; assert.equal(view.buffer, 0);
    const offset = view.byteOffset ?? 0;
    assert.ok(view.byteLength > 8 && offset + view.byteLength <= binary.length);
    assert.deepEqual([...binary.subarray(offset, offset + 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});

test('pai GLB: preserva sete animações, rig Mixamo e morphs de fala e sorriso', () => {
  const { gltf } = readGlb();
  assert.equal(gltf.materials.length, 14);
  assert.deepEqual(gltf.animations.map(animation => animation.name),
    ['Idle_Breathe', 'Walk_InPlace', 'Sit_Down', 'Seated_Idle', 'Talk_Gesture', 'Talk_Seated', 'Look_Nod']);
  assert.equal(gltf.skins.length, 1); assert.equal(gltf.skins[0].joints.length, 65);
  const joints = new Set(gltf.skins[0].joints.map(index => gltf.nodes[index].name));
  for (const name of ['Hips', 'Head', 'LeftHand', 'RightHand', 'LeftFoot', 'RightFoot'])
    assert.ok(joints.has('mixamorig1:' + name));
  const morphs = new Set(gltf.meshes.flatMap(mesh => mesh.extras?.targetNames ?? []));
  assert.ok(morphs.has('JawOpen')); assert.ok(morphs.has('Smile'));
  for (const animation of gltf.animations) {
    assert.ok(animation.channels.length > 0 && animation.samplers.length > 0);
    assert.ok(animation.channels.every(channel => gltf.nodes[channel.target.node] && animation.samplers[channel.sampler]));
  }
});
