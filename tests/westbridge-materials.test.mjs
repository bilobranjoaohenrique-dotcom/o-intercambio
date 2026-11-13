import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

function glb(path) {
  const bytes = readFileSync(new URL(path, import.meta.url));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'valid GLB magic');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'complete GLB container');
  const jsonLength = bytes.readUInt32LE(12), binHeader = 20 + jsonLength;
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  assert.equal(bytes.readUInt32LE(binHeader + 4), 0x004e4942);
  const json = JSON.parse(bytes.subarray(20, binHeader).toString());
  const binary = bytes.subarray(binHeader + 8, binHeader + 8 + bytes.readUInt32LE(binHeader));
  assert.equal(json.buffers.length, 1);
  assert.ok(json.buffers[0].byteLength <= binary.length);
  return { json, binary };
}

const original = glb('../public/models/backups/westbridge-original.glb');
const updated = glb('../public/models/westbridge.glb');
function view(asset, index) {
  const bufferView = asset.json.bufferViews[index];
  assert.equal(bufferView.buffer, 0);
  const offset = bufferView.byteOffset ?? 0;
  assert.ok(offset >= 0 && offset + bufferView.byteLength <= asset.binary.length, 'embedded data stays inside the binary');
  return asset.binary.subarray(offset, offset + bufferView.byteLength);
}

test('Westbridge: the material pass preserves the complete scene and every geometry buffer', () => {
  for (const key of ['scene', 'scenes', 'nodes', 'accessors', 'samplers', 'skins',
    'animations', 'cameras', 'extensions', 'extensionsUsed', 'extensionsRequired']) {
    assert.deepEqual(updated.json[key], original.json[key], `${key} must remain unchanged`);
  }
  // The isolated background trees originally reused the white mailbox material.
  // Only their material reference may change; their entire primitive stays intact.
  assert.equal(original.json.meshes[103].primitives.length, 1);
  assert.equal(original.json.meshes[103].primitives[0].material, 5);
  const expectedMeshes = structuredClone(original.json.meshes);
  expectedMeshes[103].primitives[0].material = 50;
  assert.deepEqual(updated.json.meshes, expectedMeshes, 'only the isolated tree material is remapped');
  const imageViews = new Set(original.json.images.map(image => image.bufferView));
  let checked = 0;
  for (let index = 0; index < original.json.bufferViews.length; index++) {
    if (imageViews.has(index)) continue;
    assert.deepEqual(updated.json.bufferViews[index], original.json.bufferViews[index], `geometry view ${index} metadata`);
    assert.deepEqual(view(updated, index), view(original, index), `geometry view ${index} bytes`);
    checked++;
  }
  assert.equal(checked, original.json.bufferViews.length - imageViews.size);
  assert.ok(checked > 0);
});

test('Westbridge: shared material assignments and authored UV channels remain intact', () => {
  assert.equal(original.json.materials.length, 50);
  assert.equal(updated.json.materials.length, 51, 'one separate tree palette avoids recolouring mailboxes and hydrants');
  for (let index = 0; index < original.json.materials.length; index++) {
    const before = original.json.materials[index], after = updated.json.materials[index];
    assert.equal(after.name, before.name, `material ${index} identity`);
    assert.equal(after.doubleSided, before.doubleSided, `material ${index} surface orientation`);
    assert.equal(after.alphaMode ?? 'OPAQUE', before.alphaMode ?? 'OPAQUE', `material ${index} opacity mode`);
    const authored = before.pbrMetallicRoughness?.baseColorTexture;
    if (authored) {
      const replacement = after.pbrMetallicRoughness?.baseColorTexture;
      assert.ok(replacement, `material ${index} retains its texture`);
      assert.equal(replacement.texCoord ?? 0, authored.texCoord ?? 0, `material ${index} authored UV set`);
      assert.deepEqual(replacement.extensions, authored.extensions, `material ${index} UV transform`);
    }
  }
  const treePalette = updated.json.materials[50];
  assert.equal(treePalette.pbrMetallicRoughness.baseColorTexture.index, 42);
  assert.equal(updated.json.textures[42].source, 42);
  assert.equal(treePalette.pbrMetallicRoughness.baseColorTexture.texCoord ?? 0, 0,
    'the isolated tree palette uses the existing authored trunk/crown UV islands');
  assert.equal(treePalette.alphaMode ?? 'OPAQUE', 'OPAQUE');
  assert.equal(treePalette.doubleSided, original.json.materials[5].doubleSided);
  for (const mesh of updated.json.meshes) for (const primitive of mesh.primitives) {
    const material = updated.json.materials[primitive.material];
    const textureInfo = material.pbrMetallicRoughness?.baseColorTexture;
    if (textureInfo) assert.ok(`TEXCOORD_${textureInfo.texCoord ?? 0}` in primitive.attributes,
      `${mesh.name} has the UV set requested by ${material.name}`);
  }
});

test('Westbridge: every remastered texture is an embedded opaque PNG at controlled resolution', () => {
  assert.equal(updated.json.images.length, 43);
  for (const [index, image] of updated.json.images.entries()) {
    assert.equal(image.mimeType, 'image/png', `image ${index} format`);
    assert.ok(Number.isInteger(image.bufferView) && !image.uri, `image ${index} is self-contained`);
    const decoded = PNG.sync.read(view(updated, image.bufferView));
    if (index === 42) {
      assert.equal(decoded.width, 1024, 'the tree atlas retains detail in its small authored UV islands');
      assert.equal(decoded.height, 1024);
    } else if (index >= 39) {
      assert.equal(decoded.width, 256, `image ${index} compact visual detail`);
      assert.equal(decoded.height, 256);
    } else {
      assert.ok(decoded.width >= 256 && decoded.width <= 512, `image ${index} width`);
      assert.ok(decoded.height >= 256 && decoded.height <= 512, `image ${index} height`);
    }
    for (let alpha = 3; alpha < decoded.data.length; alpha += 4)
      assert.equal(decoded.data[alpha], 255, `image ${index} does not cut holes into closed surfaces`);
  }
  for (const [index, texture] of updated.json.textures.entries()) {
    assert.ok(Number.isInteger(texture.source) && updated.json.images[texture.source], `texture ${index} image reference`);
    if (texture.sampler !== undefined) assert.ok(updated.json.samplers[texture.sampler], `texture ${index} sampler reference`);
    assert.equal(texture.extensions, undefined, `texture ${index} uses standard glTF image decoding`);
  }
});
