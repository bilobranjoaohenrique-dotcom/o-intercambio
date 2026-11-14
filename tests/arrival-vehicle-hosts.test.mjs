import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF/index.js';
const { createArrivalVehicleHosts } = await import('../src/scene/arrivalVehicleHosts.ts');

test('arrival hosts: the same imported actors sit in the car and restore their terminal rig/body roots', async () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  const source = new Uint8Array(readFileSync(new URL('../public/models/chegada_intercambio.glb', import.meta.url)));
  const asset = await LoadAssetContainerAsync(source, scene, { pluginExtension: '.glb',
    pluginOptions: { gltf: { skipMaterials: true, animationStartMode: 0 } } });
  asset.addAllToScene();
  for (const id of ['daniel', 'helen']) {
    const idle = asset.animationGroups.find(group => group.name === id + '__Idle');
    idle.start(false, 1, idle.from, idle.to); idle.pause(); idle.goToFrame(idle.from);
  }
  const actors = createArrivalVehicleHosts(scene, asset);
  const sameMeshes = [...actors.meshes], originalCount = scene.meshes.length;
  const roots = ['daniel_host', 'helen_host', 'daniel__Daniel_Body', 'helen__Helen_Body'].map(name => scene.getTransformNodeByName(name));
  const before = roots.map(node => ({ node, parent: node.parent, position: node.position.asArray(), quaternion: node.rotationQuaternion?.asArray() }));
  const seats = { daniel: new TransformNode('driver', scene), helen: new TransformNode('passenger', scene) };
  seats.daniel.position.set(-.43, .02, .22); seats.helen.position.set(.43, .02, .22);
  try {
    actors.setSeats(seats);
    scene.getNodeByName('__root__').setEnabled(false);
    assert.equal(actors.active, true); assert.equal(actors.diagnostics.count, 2); assert.equal(actors.diagnostics.seated, 2);
    assert.equal(scene.meshes.length, originalCount, 'transferring actors cannot create replacement meshes');
    assert.deepEqual(actors.meshes, sameMeshes);
    assert.ok(actors.meshes.every(mesh => mesh.isEnabled() && !mesh.isPickable), 'hosts remain visible after disabling their terminal');
    for (const host of actors.diagnostics.hosts) {
      assert.ok(host.bounds.max.y < 1.55, host.id + ' is seated below the vehicle ceiling');
      assert.ok(host.bounds.max.y > 1.2, host.id + ' retains adult proportions');
      assert.ok(host.bounds.max.z - host.bounds.min.z > .5, host.id + ' has bent legs rather than a lowered standing body');
    }
    actors.setSeats(null);
    assert.equal(actors.active, false); assert.equal(actors.diagnostics.seated, 0);
    for (const state of before) {
      assert.equal(state.node.parent, state.parent); assert.deepEqual(state.node.position.asArray(), state.position);
      assert.deepEqual(state.node.rotationQuaternion?.asArray(), state.quaternion);
    }
    assert.ok(asset.animationGroups.find(group => group.name === 'daniel__Idle').isStarted);
    assert.ok(!asset.animationGroups.find(group => group.name === 'daniel__Seated_Idle').isStarted);
  } finally { actors.dispose(); asset.dispose(); scene.dispose(); engine.dispose(); }
});
