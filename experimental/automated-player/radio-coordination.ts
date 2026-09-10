import type { Team } from './client.ts';
import type { Position } from './observations.ts';

export type RadioIntent =
  | { kind: 'explore'; text: string }
  | { kind: 'strike-base' | 'strike-planet'; position?: Position; text: string }
  | { kind: 'resupply'; text: string }
  | { kind: 'support'; text: string }
  | { kind: 'unknown'; text: string };

export function radioMessage(intent: Exclude<RadioIntent, { kind: 'unknown' }>): string {
  switch (intent.kind) {
    case 'explore': return 'We have a foothold. Keep building and scouting the frontier.';
    case 'resupply': return 'Low on energy or torpedoes. Falling back to base for supplies.';
    case 'support': return 'Our position is under attack. Nearby ships, support immediately.';
    case 'strike-base': return intent.position ? `Enemy base confirmed at ${intent.position.v}-${intent.position.h}. Strike group converge.` : 'Enemy base confirmed. Strike group converge.';
    case 'strike-planet': return intent.position ? `Enemy planet confirmed at ${intent.position.v}-${intent.position.h}. Move in and destroy it.` : 'Enemy planet confirmed. Move in and destroy it.';
  }
}

export function parseRadio(text: string): RadioIntent {
  const normalized = text.trim().toLowerCase();
  const coordinates = normalized.match(/(?:at|near)\s+(\d+)\s*[-,]\s*(\d+)/);
  const position = coordinates ? { v: Number(coordinates[1]), h: Number(coordinates[2]) } : undefined;
  if (/scout|scouting|explor|frontier/.test(normalized)) return { kind: 'explore', text };
  if (/falling back|resupply|low on (?:energy|torpedoes)|supplies/.test(normalized)) return { kind: 'resupply', text };
  if (/support|under attack|assist/.test(normalized)) return { kind: 'support', text };
  if (/base/.test(normalized) && /strike|attack|destroy|confirmed|converge/.test(normalized)) return { kind: 'strike-base', position, text };
  if (/planet/.test(normalized) && /strike|attack|destroy|confirmed|converge/.test(normalized)) return { kind: 'strike-planet', position, text };
  return { kind: 'unknown', text };
}

export function extractRadioMessages(text: string): RadioIntent[] {
  return [...text.matchAll(/Message from [^\r\n]+\r?\n\s*([^\r\n]+)/gi)].map(match => parseRadio(match[1]));
}

export function tellAll(team: Team, intent: Exclude<RadioIntent, { kind: 'unknown' }>): string {
  return `TELL ${team}; ${radioMessage(intent)}`;
}
