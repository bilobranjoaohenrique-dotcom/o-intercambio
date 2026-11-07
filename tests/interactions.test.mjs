import './register-typescript.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
const { createInteractions } = await import('../src/game/interactions.ts');

function fixture(run) {
  const engine = new NullEngine({ renderWidth: 640, renderHeight: 360 }), scene = new Scene(engine);
  const camera = new FreeCamera('eyes', new Vector3(0, 1, 0), scene);
  camera.setTarget(new Vector3(0, 1, 2)); camera.getViewMatrix(true);
  const box = (name, z, depth = .1) => {
    const mesh = MeshBuilder.CreateBox(name, { width: .8, height: 1.8, depth }, scene);
    mesh.material = new StandardMaterial(name + ' material', scene);
    mesh.position.set(0, 1, z); mesh.computeWorldMatrix(true); return mesh;
  };
  try { run({ scene, camera, box }); } finally { scene.dispose(); engine.dispose(); }
}

test('interação: usa o alvo mais próximo do raio central, mesmo quando registrado depois', () => fixture(({ scene, camera, box }) => {
  const near = box('near', 1.2), far = box('far', 1.8);
  let calls = 0;
  const target = { id: 'near', meshes: [near], label: () => 'Examinar mala', execute: () => { calls++; return 'Quase tudo pronto para a viagem.'; } };
  const interactions = createInteractions(scene, camera, [
    { id: 'far', meshes: [far], label: () => 'Distante', execute: () => assert.fail('far target must not win') }, target,
  ]);
  assert.equal(interactions.update(), target);
  assert.deepEqual(interactions.activate(), { id: 'near', text: 'Quase tudo pronto para a viagem.' });
  assert.equal(calls, 1);
}));

test('interação: parede ou móvel pickable bloqueia alvo, e E repica apesar de indicação anterior', () => fixture(({ scene, camera, box }) => {
  const door = box('door', 1.7); let calls = 0;
  const interactions = createInteractions(scene, camera, [{ id: 'door', meshes: [door], label: () => 'Abrir porta', execute: () => { calls++; } }]);
  assert.equal(interactions.update()?.id, 'door');
  const blocker = box('wall', .7);
  assert.equal(interactions.activate(), null, 'a prompt from the previous scan cannot interact through a newly blocking wall');
  assert.equal(calls, 0);
  blocker.setEnabled(false);
  assert.deepEqual(interactions.activate(), { id: 'door' });
  assert.equal(calls, 1);
}));

test('interação: alcance é medido até a superfície atingida e não permite usar objeto atrás da câmera', () => fixture(({ scene, camera, box }) => {
  const object = box('object', 2.31);
  const interactions = createInteractions(scene, camera, [{ id: 'photo', meshes: [object], label: () => 'Examinar fotografia', execute() {} }]);
  assert.equal(interactions.activate(), null);
  object.position.z = 2.24; object.computeWorldMatrix(true);
  assert.deepEqual(interactions.activate(), { id: 'photo' }, 'front surface at 2.19m is reachable');
  object.position.z = -1; object.computeWorldMatrix(true);
  assert.equal(interactions.activate(), null);
}));

test('interação: encontra alvo no pai da malha, rótulo dinâmico e clear limpa indicação', () => fixture(({ scene, camera, box }) => {
  const parent = new Mesh('door assembly', scene), handle = box('handle', 1.4);
  handle.parent = parent; let open = false;
  const interactions = createInteractions(scene, camera, [{ id: 'door', meshes: [parent], label: () => open ? 'Fechar porta' : 'Abrir porta', execute: () => { open = !open; } }]);
  assert.equal(interactions.update()?.label(), 'Abrir porta');
  assert.deepEqual(interactions.activate(), { id: 'door' });
  assert.equal(interactions.current.label(), 'Fechar porta');
  interactions.clear(); assert.equal(interactions.current, null);
  handle.setEnabled(false); assert.equal(interactions.update(), null);
}));

test('interação: objetos ocultos não mostram indicação e superfícies ocultas não ocluem', () => fixture(({ scene, camera, box }) => {
  const target = box('photo', 1.6), hidden = box('hidden helper', .7);
  hidden.isVisible = false;
  const interactions = createInteractions(scene, camera, [{ id: 'photo', meshes: [target], label: () => 'Examinar fotografia', execute() {} }]);
  assert.deepEqual(interactions.activate(), { id: 'photo' });
  target.isVisible = false; assert.equal(interactions.activate(), null);
  target.isVisible = true; target.visibility = 0; assert.equal(interactions.activate(), null);
}));
