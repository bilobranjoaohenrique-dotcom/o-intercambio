import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Load the two pure TS modules without requiring a browser, renderer or build.
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`;
const layoutURL = moduleURL(readFileSync(new URL('../src/game/layout.ts', import.meta.url), 'utf8'));
const layout = await import(layoutURL);
const source = readFileSync(new URL('../src/game/opening.ts', import.meta.url), 'utf8')
  .replace("from './layout'", `from '${layoutURL}'`);
const { sampleOpening, openingCuesBetween, OPENING_DURATION, MOTHER_AT } = await import(moduleURL(source));
const { BED_POSE, STANDING_POSE } = layout;
const pose = sample => ({ position: sample.position, pitch: sample.pitch, yaw: sample.yaw, roll: sample.roll });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function monotonic(start, end, direction, field) {
  const value = t => field === 'height' ? sampleOpening(t).position.y : sampleOpening(t)[field];
  let previous = value(start);
  for (let index = 1; index <= 100; index++) {
    const next = value(start + (end - start) * index / 100);
    assert.ok(direction * (next - previous) >= -1e-10, `${field} reverses in ${start}..${end}`);
    previous = next;
  }
}

test('opening: two seconds of black keep the original bed pose before the handoff', () => {
  for (const t of [-100, 0, .1, 1, 1.99, 2, NaN]) {
    const frame = sampleOpening(t);
    assert.deepEqual(pose(frame), BED_POSE);
    assert.equal(frame.eyes, 0);
    assert.equal(frame.finished, false);
  }
  assert.ok(sampleOpening(2.5).eyes > 0);
});

test('opening: eyelids open slowly, close, open further, blink and settle', () => {
  for (const [start, end, direction] of [[2, 3.15, 1], [3.45, 3.9, -1], [4.15, 5.35, 1], [5.72, 5.94, -1], [5.94, 6.34, 1]])
    monotonic(start, end, direction, 'eyes');
  assert.equal(sampleOpening(3.15).eyes, .34);
  assert.equal(sampleOpening(3.9).eyes, 0);
  assert.equal(sampleOpening(4.15).eyes, 0);
  assert.ok(sampleOpening(5.35).eyes > sampleOpening(3.15).eyes);
  assert.equal(sampleOpening(5.94).eyes, 0);
  assert.equal(sampleOpening(6.34).eyes, 1);
  for (const t of [6.4, 7, 9.2, 11.3, OPENING_DURATION]) assert.equal(sampleOpening(t).eyes, 1);
});

test('opening: closed-eye periods do not conceal a position jump', () => {
  for (const t of [0, 1, 2, 3.9, 4, 4.15, 5.94, 6.35])
    assert.deepEqual(pose(sampleOpening(t)), BED_POSE);
  assert.ok(sampleOpening(MOTHER_AT).eyes > 0);
  assert.deepEqual(pose(sampleOpening(MOTHER_AT)), BED_POSE);
});

test('opening: initial blur clears gradually without returning', () => {
  assert.equal(sampleOpening(0).blur, 1);
  monotonic(0, OPENING_DURATION, -1, 'blur');
  assert.equal(sampleOpening(7.4).blur, 0);
  assert.equal(sampleOpening(OPENING_DURATION).blur, 0);
});

test('opening: head turns, body sits, feet settle, then the camera rises', () => {
  const turning = sampleOpening(7.5), seated = sampleOpening(9.2);
  assert.ok(turning.yaw < BED_POSE.yaw, 'head turns left from the +X bed toward the free -X aisle');
  assert.ok(turning.pitch > BED_POSE.pitch);
  assert.ok(seated.position.y > BED_POSE.position.y);
  assert.ok(seated.position.y < STANDING_POSE.position.y);
  assert.ok(seated.position.x < layout.FURNITURE.bed.x - layout.FURNITURE.bed.width / 2, 'seated head reaches the open left side of the bed');
  for (const t of [9.2, 9.8, 10.6, 11.3])
    assert.deepEqual(sampleOpening(t).position, seated.position);
  assert.ok(sampleOpening(10.6).pitch > seated.pitch, 'subtle glance toward the feet');
  assert.ok(sampleOpening(12.5).position.y > seated.position.y);
  monotonic(0, OPENING_DURATION, 1, 'height');
});

test('opening: final pose exactly matches the live controller handoff', () => {
  assert.ok(OPENING_DURATION >= 13 && OPENING_DURATION <= 15);
  assert.equal(sampleOpening(OPENING_DURATION - .0001).finished, false);
  for (const t of [OPENING_DURATION, OPENING_DURATION + 10, Infinity]) {
    const final = sampleOpening(t);
    assert.equal(final.finished, true);
    assert.equal(final.position.y, 4.65);
    assert.deepEqual(pose(final), STANDING_POSE);
    assert.equal(final.eyes, 1);
    assert.equal(final.blur, 0);
  }
  assert.ok(distance(sampleOpening(OPENING_DURATION - .001).position, STANDING_POSE.position) < 1e-7);
});

test('opening: dense samples stay finite, bounded and continuous, including every phase boundary', () => {
  const h = 1 / 240;
  let previous = sampleOpening(0), lastVelocity = { x: 0, y: 0, z: 0 };
  for (let t = h; t <= OPENING_DURATION + h / 2; t += h) {
    const frame = sampleOpening(t);
    assert.ok([...Object.values(frame.position), frame.pitch, frame.yaw, frame.roll, frame.eyes, frame.blur].every(Number.isFinite));
    assert.ok(frame.eyes >= -1e-10 && frame.eyes <= 1 + 1e-10);
    assert.ok(frame.blur >= -1e-10 && frame.blur <= 1 + 1e-10);
    const velocity = Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, (frame.position[axis] - previous.position[axis]) / h]));
    assert.ok(Math.hypot(...Object.values(velocity)) < 1.5, 'no position teleport');
    assert.ok(distance(velocity, lastVelocity) / h < 6, 'body acceleration remains bounded');
    for (const angle of ['pitch', 'yaw', 'roll']) assert.ok(Math.abs(frame[angle] - previous[angle]) / h < 1.8, `no ${angle} snap`);
    assert.ok(Math.abs(frame.eyes - previous.eyes) / h < 8, 'no eyelid cut');
    previous = frame; lastVelocity = velocity;
  }
  for (const boundary of [2, 3.15, 3.45, 3.9, 4.15, 5.35, 5.72, 5.94, 6.34, 6.35, 7.4, 7.5, 9.2, 10.6, 11.3, 11.7, OPENING_DURATION]) {
    const before = sampleOpening(boundary - 1e-5), after = sampleOpening(boundary + 1e-5);
    assert.ok(distance(before.position, after.position) < 1e-4);
    for (const field of ['pitch', 'yaw', 'roll', 'eyes', 'blur']) assert.ok(Math.abs(after[field] - before[field]) < 1e-4);
  }
});

test('opening: each cue crosses once, pause repeats nothing and restart is deterministic', () => {
  const expected = ['mother', 'cloth', 'bed', 'feet'];
  assert.deepEqual(openingCuesBetween(0, OPENING_DURATION), expected);
  assert.deepEqual(openingCuesBetween(MOTHER_AT - .001, MOTHER_AT), ['mother']);
  assert.deepEqual(openingCuesBetween(MOTHER_AT, MOTHER_AT), []);
  assert.deepEqual(openingCuesBetween(MOTHER_AT, MOTHER_AT + .001), []);
  assert.deepEqual(openingCuesBetween(12, 0), []);
  assert.deepEqual(openingCuesBetween(NaN, NaN), []);
  const sampled = [];
  for (let frame = 1; frame <= OPENING_DURATION * 60; frame++) {
    const previous = (frame - 1) / 60, current = frame / 60;
    sampled.push(...openingCuesBetween(previous, current));
    assert.deepEqual(openingCuesBetween(current, current), []);
  }
  assert.deepEqual(sampled, expected);
  assert.deepEqual(openingCuesBetween(0, OPENING_DURATION), expected, 'restart reuses the exact cue schedule');
});

test('opening: sampling has no retained state and exposes no mutable pose references', () => {
  const reference = sampleOpening(8.1);
  sampleOpening(13.5).position.y = -100;
  sampleOpening(0).position.x = 100;
  sampleOpening(8.1).position.z = 100;
  assert.deepEqual(sampleOpening(8.1), reference);
  assert.deepEqual(pose(sampleOpening(0)), BED_POSE);
  assert.deepEqual(pose(sampleOpening(13.5)), STANDING_POSE);
});
