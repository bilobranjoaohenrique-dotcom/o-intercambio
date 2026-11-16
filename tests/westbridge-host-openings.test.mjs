import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import '@babylonjs/loaders/glTF/index.js';
const { applyWestbridgeHouseScale } = await import('../src/scene/westbridgeHouseScale.ts');
const { applyWestbridgeHostOpenings } = await import('../src/scene/westbridgeHostOpenings.ts');
const HOST = 'HOST_FAMILY_HOUSE_DANIEL_HELEN · ';
const close = (a, b, tolerance = 1e-4) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);

test('real host facade opens at the supplied windows/doors while neighbours, frames, roofs and authored texture coordinates remain intact', async () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  const originalBytes = readFileSync(new URL('../public/models/westbridge.glb', import.meta.url));
  const asset = await LoadAssetContainerAsync(new Uint8Array(originalBytes), scene, {
    pluginExtension: '.glb', pluginOptions: { gltf: { skipMaterials: true, animationStartMode: 0 } },
  });
  asset.addAllToScene();
  const origin = new TransformNode('same runtime origin', scene); origin.position.x = 500;
  const nodes = [...asset.transformNodes, ...asset.meshes], own = new Set(nodes);
  for (const node of nodes) if (!node.parent || !own.has(node.parent)) node.parent = origin;
  for (const mesh of asset.meshes) mesh.computeWorldMatrix(true);
  applyWestbridgeHouseScale(asset.meshes);
  const pane = asset.meshes.find(mesh => mesh.name === HOST + 'WindowGlow.008');
  pane.material = new PBRMaterial('source pane stand-in without image decoding', scene);
  const before = asset.meshes.filter(mesh => mesh.getTotalVertices()).map(mesh => ({
    mesh, data: Object.fromEntries(mesh.getVerticesDataKinds().map(kind => [kind, Array.from(mesh.getVerticesData(kind))])),
    indices: Array.from(mesh.getIndices()), material: mesh.material,
    transforms: JSON.stringify([mesh.position.asArray(), mesh.scaling.asArray(), mesh.rotation.asArray(), mesh.rotationQuaternion?.asArray()]),
  }));
  try {
    const result = applyWestbridgeHostOpenings(asset.meshes);
    assert.equal(result.diagnostics.changedMeshes, 2);
    assert.ok(result.diagnostics.cavityRemovedTriangles > 100);
    assert.ok(result.diagnostics.bayConnectionRemovedTriangles > 0);
    assert.ok(result.diagnostics.removedTriangles > 100);
    assert.ok(result.diagnostics.windowOpenings >= 20);
    assert.equal(result.frontDoorMeshes.length, 3, 'original leaf, handle and small glazing are preserved');
    const changed = new Set();
    for (const original of before) {
      const { mesh } = original;
      if (JSON.stringify(Array.from(mesh.getIndices())) !== JSON.stringify(original.indices)) changed.add(mesh.name);
      assert.equal(JSON.stringify([mesh.position.asArray(), mesh.scaling.asArray(), mesh.rotation.asArray(), mesh.rotationQuaternion?.asArray()]), original.transforms);
      for (const [kind, values] of Object.entries(original.data))
        assert.deepEqual(Array.from(mesh.getVerticesData(kind)).slice(0, values.length), values, `authored ${kind} values ${mesh.name}`);
      if (!mesh.name.startsWith(HOST) || !/ · (SidingBlue|Cream|PaintRed|Gold|WindowGlow)\./.test(mesh.name)) {
        assert.deepEqual(Array.from(mesh.getIndices()), original.indices, `unrelated geometry ${mesh.name}`);
        assert.equal(mesh.material, original.material);
      }
    }
    assert.deepEqual([...changed].sort(), ['Cream.001', 'Gold.001', 'PaintRed.001', 'SidingBlue.001', 'WindowGlow.008'].map(name => HOST + name).sort());
    assert.equal(pane.material.alpha, .14);
    assert.equal(pane.metadata.hostHouseGlass, true);
    const siding = mesh => mesh.name === HOST + 'SidingBlue.001';
    function hit(sourceX, y, z, direction, length = .7, predicate = siding) {
      return scene.pickWithRay(new Ray(new Vector3(500 - sourceX, y, z), new Vector3(...direction), length), predicate)?.hit ?? false;
    }
    assert.equal(hit(22.18, 1.6, -12.45, [0, 0, -1]), false, 'front window passes through the original siding');
    assert.equal(hit(21.2, 1.6, -12.45, [0, 0, -1]), true, 'siding between front door and window remains');
    assert.equal(hit(16.85, 1.6, -19.15, [0, 0, 1]), false, 'rear window is open');
    assert.equal(hit(18, 1.6, -19.15, [0, 0, 1]), true, 'rear siding between windows remains');
    assert.equal(hit(15.1, 4.3, -14.4, [-1, 0, 0]), false, 'upper side window is open');
    // Oblique sight lines deliberately hit the top/bottom of a siding course
    // inside the deep reveal. Flat rays between courses would miss this bug.
    for (const y of [1.29244, 1.36325, 1.67010, 1.74092, 2.04777, 2.11859]) {
      assert.equal(hit(15.90, y + .036, -14.4, [1, -.1, 0], 1), false, `left reveal cap cleared at ${y}`);
      assert.equal(hit(16.85, y + .04, -18.4, [0, -.1, -1], 1), false, `rear reveal cap cleared at ${y}`);
      assert.equal(hit(22.18, y + .037, -13.2, [0, -.1, 1], 1), false, `front reveal cap cleared at ${y}`);
    }
    for (const y of [3.93611, 4.00692, 4.31378, 4.38459, 4.69145, 4.76226])
      assert.equal(hit(15.90, y + .036, -14.4, [1, -.1, 0], 1), false, `upper reveal cap cleared at ${y}`);
    for (const y of [1.48127, 1.55208, 1.85894, 1.92975])
      assert.equal(hit(26.30, y + .036, -15.8, [-1, -.1, 0], 1), false, `garage reveal cap cleared at ${y}`);

    assert.equal(hit(23.5, 1.3, -16.85, [1, 0, 0], 1), false, 'both boxes closing the shared garage wall are opened');
    const opaque = mesh => mesh.name.startsWith(HOST) && !/WindowGlow/.test(mesh.name);
    for (const y of [.7, 1.3, 1.9]) for (const z of [-17.1, -16.85, -16.6])
      assert.equal(hit(23.5, y, z, [1, 0, 0], 1, opaque), false, `all opaque shared garage pieces clear at ${y}/${z}`);
    for (const point of [[16.9, 2.8, -15.0, 2.399], [18.9, 5.5, -15.3, 2.379], [18.6, 5.5, -15.2, 5.101], [25, 2.66, -16, 2.501]])
      assert.equal(hit(point[0], point[1], point[2], [0, -1, 0], point[3], mesh => / · (SidingBlue|Cream)\./.test(mesh.name) && mesh.name.startsWith(HOST)), false,
        'no closed siding/trim cap crosses the living room, upstairs, stair or garage');
    assert.equal(hit(17.1, 1.3, -13.1, [0, 0, 1], .8), false, 'main room connects through the old main/bay rear planes');
    assert.equal(hit(15.6, .7, -12.45, [-1, 0, 0], 1.5), true, 'angled exterior bay cheek below the window is preserved');
    const creamBefore = before.find(item => item.mesh.name === HOST + 'Cream.001');
    const creamAfter = Array.from(creamBefore.mesh.getIndices()), creamTriangles = new Set();
    for (let i = 0; i < creamAfter.length; i += 3) creamTriangles.add(creamAfter.slice(i, i + 3).join(','));
    const positions = creamBefore.data.position, world = creamBefore.mesh.computeWorldMatrix(true);
    for (let i = 0; i < creamBefore.indices.length; i += 3) {
      const ids = creamBefore.indices.slice(i, i + 3), p = ids.map(id => Vector3.TransformCoordinates(Vector3.FromArray(positions, id * 3), world));
      const normal = Vector3.Cross(p[1].subtract(p[0]), p[2].subtract(p[0]));
      const source = p.map(v => [500 - v.x, v.y, v.z]);
      const internalMasks = [
        [[15.55, .399, -18.79], [22.91, 5.621, -12.85]],
        [[23.05, .159, -18.31], [26.61, 2.671, -13.32]],
        [[22.70, .399, -17.3001], [23.40, 2.431, -16.3999]],
      ];
      const outsideInterior = internalMasks.every(([min, max]) => [0, 1, 2].some(axis =>
        Math.max(...source.map(v => v[axis])) < min[axis] - 1e-6 || Math.min(...source.map(v => v[axis])) > max[axis] + 1e-6));
      if (Math.abs(normal.y) / normal.length() < .999 && outsideInterior)
        assert.ok(creamTriangles.has(ids.join(',')), 'cream vertical frames and exterior belt faces outside the furnished volume remain verbatim');
    }

    const doorPredicate = mesh => mesh.name.startsWith(HOST) && !/WindowGlow/.test(mesh.name);
    assert.equal(hit(20.0565, 1.3, -12.45, [0, 0, -1], .8, doorPredicate), true, 'closed original door covers the opening');
    const garageOpaque = mesh => mesh.name.startsWith(HOST) && !/WindowGlow/.test(mesh.name);
    for (const sourceX of [23.7, 24.9, 26.1]) for (const y of [.5, 1.3, 2.1]) {
      const gate = scene.pickWithRay(new Ray(new Vector3(500 - sourceX, y, -14), new Vector3(0, 0, 1), 3), garageOpaque);
      assert.equal(gate?.pickedMesh?.name, HOST + 'Cream.001', 'inside the garage sees the existing closed cream gate, never its blue backing');
      close(gate.pickedPoint.z, -13.190262, .001);
    }
    for (const y of [.5, 1.3, 2.1]) {
      const outsideGate = scene.pickWithRay(new Ray(new Vector3(500 - 24.9, y, -12.5), new Vector3(0, 0, -1), 2), garageOpaque);
      assert.equal(outsideGate?.pickedMesh?.name, HOST + 'Cream.001', 'street view still sees the same closed garage leaf');
      close(outsideGate.pickedPoint.z, -13.124167, .001);
    }
    const closed = result.frontDoorCollider;
    close(closed.halfWidth * 2, .92057, .002); close(closed.minY, .400416, .001); close(closed.maxY, 2.430416, .001);
    result.setFrontDoorOpen(true);
    assert.equal(result.frontDoorOpen, true);
    assert.equal(hit(20.0565, 1.3, -12.45, [0, 0, -1], .8, doorPredicate), false, 'door swings away from the passage');
    // Sight lines hit both faces of every siding-course cap inside the open
    // door reveal, then continue at least 30cm past the exterior wall.
    for (const y of [.53710, .60791, .91477, .98558, 1.29244, 1.36325, 1.67010, 1.74092, 2.04777, 2.11859]) {
      assert.equal(hit(20.0565, y + .0355, -13.2, [0, -.1, 1], 1, doorPredicate), false,
        `open door reveal is clear looking from inside out at ${y}`);
      assert.equal(hit(20.0565, y + .0445, -12.4, [0, -.1, -1], 1, doorPredicate), false,
        `open door reveal is clear looking from outside in at ${y}`);
    }

    const opened = result.frontDoorCollider;
    close(opened.halfDepth * 2, closed.halfWidth * 2, .001);
    close(opened.halfWidth * 2, closed.halfDepth * 2, .001);
    assert.ok(opened.z > closed.z, 'door opens out onto the porch rather than blocking the furnished hall');
    assert.ok(opened.z + opened.halfDepth < -11.0942 && opened.z - opened.halfDepth > -12.7112, 'open leaf stays above the porch floor');
    assert.ok(500 - opened.x > 18.85 && 500 - opened.x < 21.26, 'open leaf clears the columns and side railings');
    result.setFrontDoorOpen(false);
    assert.deepEqual(result.frontDoorCollider, closed, 'closing restores the same collider');
    assert.deepEqual(readFileSync(new URL('../public/models/westbridge.glb', import.meta.url)), originalBytes);
  } finally { asset.dispose(); scene.dispose(); engine.dispose(); }
});
