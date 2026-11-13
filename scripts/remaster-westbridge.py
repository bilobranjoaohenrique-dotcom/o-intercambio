"""Rebuild only Westbridge's material/image payload from its immutable backup.

Run from the repository root: python scripts/remaster-westbridge.py
PNG sources are shipped alongside the self-contained GLB. No Blender round-trip,
mesh conversion, decimation, vertex/UV edits or change of scene lighting occurs.
"""
from pathlib import Path
from copy import deepcopy
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'public/models/backups/westbridge-original.glb'
TARGET = ROOT / 'public/models/westbridge.glb'
TEXTURES = ROOT / 'public/textures/westbridge'
EXPECTED = '1df6a28d7950ae4d022590e598c0812a0c524a3c5a71373a1fea24960ed0c721'
source = SOURCE.read_bytes()
assert hashlib.sha256(source).hexdigest() == EXPECTED, 'Unexpected original backup'
json_size = struct.unpack_from('<I', source, 12)[0]
original = json.loads(source[20:20+json_size])
bin_header = 20 + json_size
bin_size = struct.unpack_from('<I', source, bin_header)[0]
original_binary = source[bin_header+8:bin_header+8+bin_size]
gltf = deepcopy(original)
# Keeping the original payload as an intact prefix makes the preservation check
# independent of the texture pipeline; every geometry view keeps its offset.
binary = bytearray(original_binary)
manifest = []
for index in range(43):
    files = list(TEXTURES.glob(f'{index:02d}-*.png'))
    assert len(files) == 1, f'Expected one image for slot {index}'
    path = files[0]; data = path.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    width, height = struct.unpack_from('>II', data, 16)
    assert 256 <= width <= 1024 and 256 <= height <= 1024
    binary.extend(b'\x00' * ((-len(binary)) % 4))
    view = len(gltf['bufferViews'])
    gltf['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(data)})
    binary.extend(data)
    image = {'name': path.stem, 'mimeType': 'image/png', 'bufferView': view}
    if index < 39:
        gltf['images'][index] = image
    else:
        gltf['images'].append(image)
        gltf['textures'].append({'source': index, 'sampler': gltf['textures'][0]['sampler']})
    manifest.append({'index': index, 'file': path.name, 'width': width, 'height': height,
        'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})

def roughness(index, value, metallic=0):
    pbr = gltf['materials'][index]['pbrMetallicRoughness']
    pbr['roughnessFactor'] = value; pbr['metallicFactor'] = metallic

for i in [0,2,8,30,31,32,42,43,48]: roughness(i, .97)
for i in [3,14,15,16,17,18,19,20]: roughness(i, 1)
for i in [7,9,10,11,12,23,24,25,26,27,28,29,35,36,37,44,45,47,49]: roughness(i, .90)
for i in [1,22]: roughness(i, .68, .18)
for i in [21,41]: roughness(i, .65, .32)
roughness(33, .38)

def assign(index, texture):
    gltf['materials'][index]['pbrMetallicRoughness']['baseColorTexture'] = {'index': texture, 'texCoord': 0}

# Windows remain opaque: there are no interiors behind these panes. A subdued
# painted reflection and varied roughness do not add reflection render passes.
assign(34, 39)
gltf['materials'][34]['pbrMetallicRoughness']['baseColorFactor'] = [1,1,1,1]
gltf['materials'][34]['emissiveFactor'] = [v*.12 for v in original['materials'][34]['emissiveFactor']]
roughness(34, .34)
assign(1, 40)
for i in [38,39,40]: assign(i, 41)

# The source accidentally uses shared white street-prop paint on 13 trees.
# Their own UV0 already separates bark from foliage. A single local material
# remap restores those regions without tinting hydrants/mailboxes or changing
# the primitive, its attributes, vertices, indices or UV coordinates.
assert gltf['meshes'][103]['name'] == 'tree_round_2275.001'
assert gltf['meshes'][103]['primitives'][0]['material'] == 5
tree = deepcopy(original['materials'][5])
tree['name'] = 'Westbridge · casca e folhagem no UV original'
tree['pbrMetallicRoughness']['baseColorTexture'] = {'index': 42, 'texCoord': 0}
tree['pbrMetallicRoughness']['roughnessFactor'] = .96
gltf['materials'].append(tree)
gltf['meshes'][103]['primitives'][0]['material'] = 50

# Validate the entire immutable scene, allowing just that material assignment.
comparison_meshes = deepcopy(gltf['meshes'])
comparison_meshes[103]['primitives'][0]['material'] = 5
assert comparison_meshes == original['meshes']
for field in ['scene','scenes','nodes','accessors','samplers','cameras','animations','skins','extensions']:
    assert gltf.get(field) == original.get(field), field
assert binary[:len(original_binary)] == original_binary
image_views = {image['bufferView'] for image in original['images']}
geometry = hashlib.sha256(); checked = 0
for i, view in enumerate(original['bufferViews']):
    if i in image_views: continue
    assert gltf['bufferViews'][i] == view
    start = view.get('byteOffset',0); end = start + view['byteLength']
    assert binary[start:end] == original_binary[start:end]
    geometry.update(original_binary[start:end]); checked += 1

gltf['buffers'][0]['byteLength'] = len(binary)
encoded = json.dumps(gltf, ensure_ascii=False, separators=(',',':')).encode()
encoded += b' ' * ((-len(encoded)) % 4)
binary.extend(b'\x00' * ((-len(binary)) % 4))
length = 12 + 8 + len(encoded) + 8 + len(binary)
result = struct.pack('<III',0x46546c67,2,length) + struct.pack('<II',len(encoded),0x4e4f534a) + encoded
result += struct.pack('<II',len(binary),0x004e4942) + binary
TARGET.write_bytes(result)
report = {'source': SOURCE.relative_to(ROOT).as_posix(), 'sourceSha256': EXPECTED,
    'file': TARGET.relative_to(ROOT).as_posix(), 'bytes': len(result),
    'sha256': hashlib.sha256(result).hexdigest(),
    'geometry': {'meshes': len(original['meshes']), 'nodes': len(original['nodes']),
        'unchangedGeometryBufferViews': checked, 'sha256': geometry.hexdigest(),
        'binaryPrefixExact': True, 'positionsNormalsIndicesUvsAndTransformsExact': True,
        'onlyPrimitiveMaterialRemap': {'mesh':103,'primitive':0,'from':5,'to':50,'authoredUvSet':0}},
    'materials': len(gltf['materials']), 'textures': manifest,
    'textureRgbaBytesBeforeMipmaps': sum(t['width']*t['height']*4 for t in manifest),
    'sourceTextureRgbaBytesBeforeMipmaps': 39*128*128*4,
    'note':'Only material/image payload and one isolated tree material assignment changed. No scene, camera, light, collision or gameplay edits.'}
(TEXTURES / 'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({key:report[key] for key in ['file','bytes','sha256','materials','geometry']},ensure_ascii=False))
