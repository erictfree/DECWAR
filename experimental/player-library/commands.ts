export type Coordinates = Readonly<{ v: number; h: number }>;

function coordinate(value: Coordinates): string {
  if (!Number.isInteger(value.v) || !Number.isInteger(value.h) || value.v < 1 || value.v > 100 || value.h < 1 || value.h > 100) {
    throw new RangeError('Coordinates must be integer sectors from 1 through 100.');
  }
  return `${value.v} ${value.h}`;
}

function energy(value: number): string {
  if (!Number.isInteger(value) || value < 1) throw new RangeError('Weapon energy must be a positive integer.');
  return String(value);
}

export const commands = {
  move(destination: Coordinates): string { return `MOVE ABSOLUTE ${coordinate(destination)}`; },
  impulse(destination: Coordinates): string { return `IMPULSE ABSOLUTE ${coordinate(destination)}`; },
  phasers(amount: number, target: Coordinates): string { return `PHASERS ABSOLUTE ${energy(amount)} ${coordinate(target)}`; },
  torpedoes(target: Coordinates): string { return `TORPEDOES ABSOLUTE ${coordinate(target)}`; },
  dock(): string { return 'DOCK'; },
  capture(target: Coordinates): string { return `CAPTURE ABSOLUTE ${coordinate(target)}`; },
  build(target: Coordinates): string { return `BUILD ABSOLUTE ${coordinate(target)}`; },
} as const;
