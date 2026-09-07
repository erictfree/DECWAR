import { play, type PlayerOptions } from '../automated-player/player.ts';

/** Transitional public runner. It preserves the Austin dialogue and recovery behavior. */
export async function runPlayer(options: PlayerOptions) {
  return play(options);
}

export type { PlayerOptions };
