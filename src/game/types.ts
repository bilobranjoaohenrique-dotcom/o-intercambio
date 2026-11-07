import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Point2 } from './layout';
export type Obstacle = Point2 & { halfWidth: number; halfDepth: number; rotation?: number };
export type InteractionTarget = {
  id: string;
  meshes: AbstractMesh[];
  label: () => string;
  execute: () => string | void;
};
export type Settings = {
  sensitivity: number; headBob: boolean; volume: number; subtitles: boolean;
  quality: 'low' | 'balanced' | 'high'; grain: boolean; performance: boolean;
};
