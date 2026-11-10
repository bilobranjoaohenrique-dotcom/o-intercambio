import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import './register-typescript.mjs';
import { FAMILY_CAR } from '../src/game/garageLayout.ts';

const bytes = readFileSync(new URL('../public/models/carro_intercambio.glb', import.meta.url));
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
  const accessor = gltf.accessors[index], view = gltf.bufferViews[accessor.bufferView];
  const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
  const [size, method] = { 5121: [1, 'readUInt8'], 5123: [2, 'readUInt16LE'],
    5125: [4, 'readUInt32LE'], 5126: [4, 'readFloatLE'] }[accessor.componentType];
  assert.ok(width && size && !accessor.sparse);
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0), stride = view.byteStride ?? width * size;
  assert.ok(start + (accessor.count - 1) * stride + width * size <= binary.length);
  return Array.from({ length: accessor.count }, (_, row) => Array.from({ length: width }, (_, column) =>
    binary[method](start + row * stride + column * size)));
}

test('carro GLB: arquivo enviado é autocontido e conserva as três texturas JPEG', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'e98c20f42e3861223420da8cea903fdaeaef393ea2c566ce88b9613f63ee7908');
  const { gltf, binary } = readGlb();
  assert.equal(gltf.asset.version, '2.0'); assert.equal(gltf.buffers.length, 1);
  assert.equal(gltf.buffers[0].uri, undefined);
  assert.ok(binary.length >= gltf.buffers[0].byteLength && binary.length - gltf.buffers[0].byteLength < 4);
  assert.equal(gltf.materials.length, 1); assert.equal(gltf.images.length, 3);
  for (const image of gltf.images) {
    assert.equal(image.uri, undefined); assert.equal(image.mimeType, 'image/jpeg');
    const view = gltf.bufferViews[image.bufferView], offset = view.byteOffset ?? 0;
    assert.equal(view.buffer, 0); assert.ok(view.byteLength > 8 && offset + view.byteLength <= binary.length);
    assert.deepEqual([...binary.subarray(offset, offset + 2)], [255, 216]);
  }
});

test('carro GLB: geometria válida mantém proporções compatíveis com a garagem existente', () => {
  const { gltf, binary } = readGlb();
  assert.equal(gltf.meshes.length, 1); assert.equal(gltf.skins?.length ?? 0, 0);
  assert.equal(gltf.animations?.length ?? 0, 0);
  for (const primitive of gltf.meshes[0].primitives) {
    const positions = values(gltf, binary, primitive.attributes.POSITION);
    const normals = values(gltf, binary, primitive.attributes.NORMAL);
    const uv = values(gltf, binary, primitive.attributes.TEXCOORD_0);
    assert.ok(positions.length > 1000 && positions.length < 100000, 'the static car has a browser-sized mesh');
    assert.equal(normals.length, positions.length); assert.equal(uv.length, positions.length);
    assert.ok(positions.every(p => p.every(Number.isFinite)));
    assert.ok(normals.every(p => p.every(Number.isFinite))); assert.ok(uv.every(p => p.every(Number.isFinite)));
    const indices = values(gltf, binary, primitive.indices).flat(); assert.equal(indices.length % 3, 0);
    assert.ok(indices.every(index => Number.isInteger(index) && index >= 0 && index < positions.length));
    const accessor = gltf.accessors[primitive.attributes.POSITION];
    const size = accessor.max.map((value, i) => value - accessor.min[i]);
    const uniformScale = FAMILY_CAR.length / size[2];
    assert.ok(Math.abs(size[0] * uniformScale - FAMILY_CAR.width) < .03,
      'uniformly fitting the supplied length preserves the established car width');
    assert.ok(size[1] * uniformScale > 1.2 && size[1] * uniformScale <= FAMILY_CAR.height,
      'the supplied car keeps a plausible height without axis stretching');
    assert.ok(Math.abs(accessor.min[1]) < .001, 'the model is authored on its wheel contact plane');
  }
});
