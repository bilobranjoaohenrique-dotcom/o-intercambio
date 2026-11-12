import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { CABIN_PASSENGER_SEATS: seats } = await import('../src/game/cabinPassengerLayout.ts');
const { PLANE_SEAT, PLANE_WINDOW } = await import('../src/game/planeLayout.ts');

test('cabin passengers: thirty distinct places keep the protagonist and window lean free', () => {
  assert.equal(seats.length, 30);
  assert.equal(new Set(seats.map(seat => seat.id)).size, 30);
  assert.equal(new Set(seats.map(seat => seat.sourceId)).size, 30);
  for (const seat of seats) {
    assert.ok([seat.position.x, seat.position.y, seat.position.z, seat.scale].every(Number.isFinite));
    assert.ok(seat.scale > .8 && seat.scale < 1.1);
    for (const camera of [PLANE_SEAT.position, PLANE_WINDOW.focusPose.position])
      assert.ok(Math.hypot(seat.position.x - camera.x, seat.position.z - camera.z) > .6,
        'no body occupies the protagonist or window-focus position');
    for (const other of seats) if (other !== seat && Math.abs(other.position.z - seat.position.z) < .35)
      assert.ok(Math.abs(other.position.x - seat.position.x) > .58, 'nearby shoulders must not overlap');
  }
});

test('cabin passengers: every appearance retains its own rig and seated clip in the shared GLB', () => {
  const bytes = readFileSync(new URL('../public/models/passageiros_intercambio.glb', import.meta.url));
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.equal(gltf.skins.length, 30); assert.equal(gltf.animations.length, 30);
  assert.equal(gltf.images.length, 31, 'thirty atlases share the same normal image');
  assert.ok(gltf.images.every(image => image.bufferView !== undefined && !image.uri));
  for (const seat of seats) {
    const root = gltf.nodes.findIndex(node => node.name === seat.sourceId);
    assert.ok(root >= 0);
    const descendants = new Set();
    const visit = index => { assert.ok(!descendants.has(index)); descendants.add(index); for (const child of gltf.nodes[index].children ?? []) visit(child); };
    visit(root);
    const bodies = [...descendants].map(index => gltf.nodes[index]).filter(node => node.skin !== undefined);
    assert.equal(bodies.length, 2, 'oral cavity and body remain with the same actor');
    for (const body of bodies) assert.ok(gltf.skins[body.skin].joints.every(joint => descendants.has(joint)), 'no actor uses another actor’s bones');
    const clip = gltf.animations.find(animation => animation.name === seat.sourceId + '::Pose_Sentado_Cabine');
    assert.ok(clip); assert.ok(clip.channels.every(channel => descendants.has(channel.target.node)));
  }
});
