import { BED_POSE, STANDING_POSE, type Point3 } from './layout';

/** The game clock advances only while playing. No real-time timers or input. */
export const OPENING_DURATION = 13.5;
export const MOTHER_AT = 4.8;
export type OpeningCue = 'mother' | 'cloth' | 'bed' | 'feet';
export type OpeningSample = {
  position: Point3;
  pitch: number;
  yaw: number;
  roll: number;
  eyes: number;
  blur: number;
  finished: boolean;
};
type Pose = Pick<OpeningSample, 'position' | 'pitch' | 'yaw' | 'roll'>;
type PoseKey = { at: number; pose: Pose };
type ScalarKey = { at: number; value: number };

// Eyes finish their last blink before the head and body start moving. The first
// two seconds, and both closed-eye pauses, therefore retain the bed viewpoint.
const EYES: readonly ScalarKey[] = [
  { at: 0, value: 0 }, { at: 2, value: 0 },
  { at: 3.15, value: .34 }, { at: 3.45, value: .34 },
  { at: 3.9, value: 0 }, { at: 4.15, value: 0 },
  { at: 5.35, value: .78 }, { at: 5.72, value: .78 },
  { at: 5.94, value: 0 }, { at: 6.34, value: 1 },
];
const BLUR: readonly ScalarKey[] = [
  { at: 0, value: 1 }, { at: 2, value: 1 },
  { at: 3.15, value: .76 }, { at: 5.35, value: .22 },
  { at: 6.4, value: .08 }, { at: 7.4, value: 0 },
];
const SITTING: Pose = {
  position: { x: STANDING_POSE.position.x - .1, y: BED_POSE.position.y + .24, z: STANDING_POSE.position.z },
  yaw: STANDING_POSE.yaw, pitch: .1, roll: .006,
};
const POSES: readonly PoseKey[] = [
  { at: 0, pose: BED_POSE },
  { at: 6.35, pose: BED_POSE },
  // Look toward the room first, then move the body to the edge of the bed.
  { at: 7.5, pose: { position: { x: BED_POSE.position.x + .07, y: BED_POSE.position.y + .03, z: BED_POSE.position.z + .11 }, yaw: 1.15, pitch: -.82, roll: .028 } },
  { at: 9.2, pose: SITTING },
  // Sitting remains spatially still: only a small glance toward the feet.
  { at: 10.6, pose: { ...SITTING, pitch: .28, roll: 0 } },
  { at: 11.3, pose: { ...SITTING, pitch: .16, roll: 0 } },
  { at: 11.7, pose: { position: { x: STANDING_POSE.position.x + .02, y: SITTING.position.y + .04, z: STANDING_POSE.position.z + .06 }, yaw: STANDING_POSE.yaw, pitch: .2, roll: -.008 } },
  { at: OPENING_DURATION, pose: STANDING_POSE },
];
const CUES: readonly { at: number; cue: OpeningCue }[] = [
  { at: MOTHER_AT, cue: 'mother' },
  { at: 6.55, cue: 'cloth' },
  { at: 7.65, cue: 'bed' },
  { at: 10.6, cue: 'feet' },
];

const time = (seconds: number) => Number.isNaN(seconds)
  ? 0 : Math.max(0, Math.min(OPENING_DURATION, seconds));
const mix = (a: number, b: number, weight: number) => a + (b - a) * weight;
/** Zero velocity and acceleration at both ends, without overshoot. */
const ease = (fraction: number) => {
  const t = Math.max(0, Math.min(1, fraction));
  return Math.max(0, Math.min(1, t * t * t * (t * (t * 6 - 15) + 10)));
};

function scalar(keys: readonly ScalarKey[], seconds: number): number {
  for (let index = 1; index < keys.length; index++) {
    const end = keys[index], start = keys[index - 1];
    if (seconds <= end.at)
      return mix(start.value, end.value, ease((seconds - start.at) / (end.at - start.at)));
  }
  return keys[keys.length - 1].value;
}

function copyPose(pose: Pose): Pose {
  return { position: { ...pose.position }, pitch: pose.pitch, yaw: pose.yaw, roll: pose.roll };
}

function poseAt(seconds: number): Pose {
  if (seconds >= OPENING_DURATION) return copyPose(STANDING_POSE);
  for (let index = 1; index < POSES.length; index++) {
    const end = POSES[index], start = POSES[index - 1];
    if (seconds > end.at) continue;
    const weight = ease((seconds - start.at) / (end.at - start.at));
    return {
      position: {
        x: mix(start.pose.position.x, end.pose.position.x, weight),
        y: mix(start.pose.position.y, end.pose.position.y, weight),
        z: mix(start.pose.position.z, end.pose.position.z, weight),
      },
      pitch: mix(start.pose.pitch, end.pose.pitch, weight),
      yaw: mix(start.pose.yaw, end.pose.yaw, weight),
      roll: mix(start.pose.roll, end.pose.roll, weight),
    };
  }
  return copyPose(STANDING_POSE);
}

/** Pure animation sample. Copy the final pose into the live controller before
 * enabling it; `finished` remains false throughout every earlier frame. */
export function sampleOpening(seconds: number): OpeningSample {
  const t = time(seconds);
  return { ...poseAt(t), eyes: scalar(EYES, t), blur: scalar(BLUR, t), finished: t >= OPENING_DURATION };
}

/** Cues belong to (previous, current]. Repeated/paused frames emit nothing;
 * rewinding is a fresh sequence and never replays stale cues in reverse. */
export function openingCuesBetween(previous: number, current: number): OpeningCue[] {
  const from = time(previous), to = time(current);
  if (to <= from) return [];
  return CUES.filter(event => event.at > from && event.at <= to).map(event => event.cue);
}
