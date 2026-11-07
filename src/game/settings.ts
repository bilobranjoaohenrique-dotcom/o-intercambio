import type { Settings } from './types';
export const SETTINGS_KEY = 'o-intercambio.settings.v1';
export const defaults: Settings = { sensitivity: 1, headBob: true, volume: .65, subtitles: true, quality: 'balanced', grain: true, performance: false };
export function normalizeSettings(value: unknown): Settings {
  const settings = { ...defaults };
  if (!value || typeof value !== 'object') return settings;
  const raw = value as Record<string, unknown>;
  for (const key of ['headBob', 'subtitles', 'grain', 'performance'] as const)
    if (typeof raw[key] === 'boolean') settings[key] = raw[key];
  if (typeof raw.sensitivity === 'number' && Number.isFinite(raw.sensitivity)) settings.sensitivity = Math.max(.2, Math.min(2.5, raw.sensitivity));
  if (typeof raw.volume === 'number' && Number.isFinite(raw.volume)) settings.volume = Math.max(0, Math.min(1, raw.volume));
  if (raw.quality === 'low' || raw.quality === 'balanced' || raw.quality === 'high') settings.quality = raw.quality;
  return settings;
}
export function loadSettings(): Settings {
  try { return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')); }
  catch { return { ...defaults }; }
}
export function storeSettings(settings: Settings): boolean {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings))); return true; }
  catch { return false; }
}
