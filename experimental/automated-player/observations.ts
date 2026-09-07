export type Position = { v: number; h: number };
export type ShipStatus = {
  observedAt: number;
  stardate: number;
  position: Position;
  condition: 'Green' | 'Yellow' | 'Red';
  docked: boolean;
  energy: number;
  torpedoes: number;
  hullDamage: number;
  shieldsUp: boolean;
  shieldPercent: number;
};

export type TeamPoints = {
  observedAt: number;
  federation: number;
  empire: number;
  categories: Record<string, { federation: number; empire: number }>;
};

// POINTS FED EMPIRE has exactly two selected columns. Parse displayed totals
// rather than reconstructing private score categories. Source: Austin
// DECWAR.FOR POINTS:2893-3056 and MSG.MAC:212.
export function parseTeamPoints(text: string, observedAt = Date.now()): TeamPoints {
  const rows = [...text.matchAll(/^Total points:[\t ]+(-?\d+\.\d)[\t ]+(-?\d+\.\d)\r?$/gm)];
  if (rows.length !== 1) throw new Error(`Expected one two-team POINTS total, found ${rows.length}`);
  const categories: TeamPoints['categories'] = {};
  for (const line of text.split(/\r?\n/)) {
    const row = /^([A-Za-z][A-Za-z .]*?)(?:[\t ]+\([\t ]*\d+\))?[\t ]+(-?\d+\.\d)[\t ]+(-?\d+\.\d)$/.exec(line);
    if (!row || row[1].trim() === 'Total points') continue;
    const label = row[1].trim().replace(/[\t ]+/g, ' ');
    categories[label] = { federation: Number(row[2]), empire: Number(row[3]) };
  }
  return { observedAt, federation: Number(rows[0][1]), empire: Number(rows[0][2]), categories };
}

// Austin DECWAR.FOR STATUS:3860-3991; MSG.MAC:292-306; PRLOC:3078-3102.
// These are displayed player units, not internal word values. Parsing decimal
// reports does not replace or emulate the game's PDP-10 arithmetic.
export function parseStatus(text: string, observedAt = Date.now()): ShipStatus {
  const one = (label: string, pattern: RegExp): RegExpExecArray => {
    const matches = [...text.matchAll(new RegExp(pattern.source, 'gm'))];
    if (matches.length !== 1) throw new Error(`Expected one ${label} in STATUS, found ${matches.length}`);
    return matches[0];
  };
  const number = (label: string, pattern: RegExp) => Number(one(label, pattern)[1]);
  const stardate = number('stardate', /^Stardate[\t ]+(\d+)\r?$/);
  const condition = one('condition', /^Condition[\t ]+(Docked\+)?(Green|Yellow|Red)\r?$/);
  const location = one('location', /^Location[\t ]+(\d+)-(\d+)\r?$/);
  const energy = number('energy', /^Energy left[\t ]+(-?\d+\.\d)\r?$/);
  const torpedoes = number('torpedoes', /^Torpedoes[\t ]+(\d+)\r?$/);
  const hullDamage = number('hull damage', /^Damage[\t ]+(\d+\.\d)\r?$/);
  const shields = one('shields', /^Shields[\t ]+([+-])(\d+\.\d)%[\t ]+\d+\.\d units\r?$/);
  const position = { v: Number(location[1]), h: Number(location[2]) };
  if (![position.v, position.h].every(n => n >= 1 && n <= 75) || torpedoes > 10 || Number(shields[2]) > 100) {
    throw new Error('STATUS values outside supported Austin bounds');
  }
  return {
    observedAt, stardate, position, energy, torpedoes, hullDamage,
    condition: condition[2] as ShipStatus['condition'], docked: !!condition[1],
    shieldsUp: shields[1] === '+', shieldPercent: Number(shields[2]),
  };
}

// LSTOBJ:2083-2140 and WARMAC.MAC ODISP:1959-2032. Request BASES with
// long output and absolute coordinates; consume only unstarred friendly rows.
export function parseFriendlyBases(text: string, team: 'FEDERATION' | 'EMPIRE'): Position[] {
  const label = team === 'FEDERATION' ? 'Fed Base' : 'Emp Base';
  const rows = [...text.matchAll(new RegExp(`^ ${label}[\\t ]+@[\\t ]*(\\d+)-[\\t ]*(\\d+)(?:[\\t ]+[^\\r\\n]*)?\\r?$`, 'gm'))];
  return rows.map(row => ({ v: Number(row[1]), h: Number(row[2]) }))
    .filter(p => p.v >= 1 && p.v <= 75 && p.h >= 1 && p.h <= 75);
}

export function distance(a: Position, b: Position): number {
  return Math.max(Math.abs(a.v - b.v), Math.abs(a.h - b.h));
}

export type Cell = Position & { symbol: string; observedAt: number };
export type Scan = { cells: Cell[]; observedAt: number };
export const positionKey = (p: Position): string => `${p.v},${p.h}`;
export const fleetSymbols = { FEDERATION: 'EFILNSTVY', EMPIRE: 'BCDGHJMPW' } as const;
export const shipNames = {
  FEDERATION: ['Excalibur', 'Farragut', 'Intrepid', 'Lexington', 'Nimitz', 'Savannah', 'Trenton', 'Vulcan', 'Yorktown'],
  EMPIRE: ['Buzzard', 'Cobra', 'Demon', 'Goblin', 'Hawk', 'Jackal', 'Manta', 'Panther', 'Wolf'],
} as const;
export type ListedObject = {
  name: string; kind: 'ship' | 'base' | 'planet' | 'romulan';
  faction: 'FEDERATION' | 'EMPIRE' | 'NEUTRAL' | 'ROMULAN';
  position?: Position; shieldPercent?: number; shieldsUp?: boolean; builds?: number;
  observedAt: number;
};

// Default LIST, Austin LSTSCN:1519ff, LSTUPD:1922ff, LSTOBJ:2083-2140.
// Out-of-range ships have NO coordinates. Known distant bases may have a
// location but no shield reading. Keep those absences rather than guessing.
function parseObjectRows(text: string, observedAt: number): ListedObject[] {
  const labels = [...shipNames.FEDERATION, ...shipNames.EMPIRE, 'Fed Base', 'Emp Base', 'Neu planet', 'Fed planet', 'Emp planet', 'Romulan'];
  const rows = [...text.matchAll(new RegExp(`^[ *](${labels.join('|')})[\\t ]+([^\\r\\n]+)\\r?$`, 'gm'))];
  const result: ListedObject[] = [];
  for (const row of rows) {
    const name = row[1], body = row[2].trim();
    const shipSide = Object.entries(shipNames).find(([, names]) => (names as readonly string[]).includes(name))?.[0];
    const kind: ListedObject['kind'] = shipSide ? 'ship' : name === 'Romulan' ? 'romulan' : name.endsWith('Base') ? 'base' : 'planet';
    const faction = (shipSide ?? (name.startsWith('Fed') ? 'FEDERATION' : name.startsWith('Emp') ? 'EMPIRE' : name === 'Romulan' ? 'ROMULAN' : 'NEUTRAL')) as ListedObject['faction'];
    const object: ListedObject = { name, kind, faction, observedAt };
    if (body === 'out of range' && (kind === 'ship' || kind === 'romulan')) { result.push(object); continue; }
    const location = /^@[\t ]*(\d+)-[\t ]*(\d+)(.*)$/.exec(body);
    if (!location) throw new Error(`Invalid LIST location for ${name}`);
    object.position = { v: Number(location[1]), h: Number(location[2]) };
    if (![object.position.v, object.position.h].every(n => n >= 1 && n <= 75)) throw new Error('LIST coordinate outside Austin bounds');
    const detail = location[3].trim();
    if (kind === 'planet') {
      if (detail && !/^\d+ builds?$/.test(detail)) throw new Error('Invalid LIST planet builds');
      object.builds = detail ? Number.parseInt(detail) : 0;
    } else if (detail) {
      const shields = /^([+-]?)(\d+\.\d)%$/.exec(detail);
      if (!shields || Number(shields[2]) > 100) throw new Error('Invalid LIST shield reading');
      object.shieldPercent = Number(shields[2]);
      if (kind === 'ship') object.shieldsUp = shields[1] !== '-';
    }
    result.push(object);
  }
  return result;
}

export function parseList(text: string, observedAt = Date.now()): ListedObject[] {
  const result = parseObjectRows(text, observedAt);
  if (!result.some(o => o.kind === 'ship')) throw new Error('Incomplete default LIST report: no ship rows');
  return result;
}

// TARGET is an entry point into LSTSCN and uses the same LSTOBJ rows as LIST,
// restricted to enemies within KRANGE (10). Unlike default LIST, a valid
// result may contain only a base or planet, or no rows at all.
// Source: Austin DECWAR.FOR:1376-1379, 1550-1555, 1788-1803, 1960-2060.
export function parseTargets(text: string, observedAt = Date.now()): ListedObject[] {
  const result = parseObjectRows(text, observedAt);
  if (!result.length && !/(?:\bno targets?\b|\bno enemy forces in range\b)/i.test(text)) throw new Error('Incomplete TARGETS report');
  return result;
}

export type TorpedoOutcome = 'hit' | 'deflected' | 'miss' | 'misfire' | 'black-hole' | 'friendly-neutralized' | 'star-unaffected' | 'nova' | 'unknown';

// Player TORP emits one result for the one-torpedo bursts used by this bot.
// Keep unknown distinct: terminal timing can defer a queued hit message, and
// absence of a phrase is not evidence of a miss. Source: OUTHIT
// DECWAR.FOR:2395-2555 and MSG.MAC:161-191, 340-348.
export function classifyTorpedoOutcome(text: string): TorpedoOutcome {
  if (/\bMISFIRES!/.test(text)) return 'misfire';
  if (/torpedo deflected by|deflected T/i.test(text)) return 'deflected';
  if (/neutralized by friendly object|neutralized/i.test(text)) return 'friendly-neutralized';
  if (/swallowed by black hole|\bgulp\b/i.test(text)) return 'black-hole';
  if (/UNAFFECTED by Photon Torpedo/i.test(text)) return 'star-unaffected';
  if (/\bnovas\b/i.test(text)) return 'nova';
  if (/torpedo hit on|\bunit T\b/i.test(text)) return 'hit';
  if (/\btorpedo\s+\d+\s+(?:miss|lost\s+@)|\b\d+\s+miss\b/i.test(text)) return 'miss';
  return 'unknown';
}

// Austin WARMAC.MAC SETSCN/OBJTBL/SHWSCN:2350-2543. Long scans use
// fixed TWO-character cells, including two spaces for a black hole. Never
// split rows on whitespace: that would silently turn hazards into empty space.
export function parseScan(text: string, observedAt = Date.now()): Scan {
  const lines = text.split('\n').map(line => line.replace(/\r/g, ''));
  const first = lines.findIndex(line => /^[ \d]\d (?:.{2}){1,21} [ \d]\d$/.test(line));
  if (first < 1) throw new Error('No complete long scan found');
  const header = lines[first - 1];
  if (!/^\s+\d+(?:\s+\d+)*\s*$/.test(header)) throw new Error('Missing scan coordinate header');
  const columns = header.trim().split(/\s+/).map(Number);
  const hmin = columns[0];
  const cells: Cell[] = [];
  let previousV: number | undefined, width: number | undefined, i = first;
  for (; i < lines.length; i++) {
    const match = /^([ \d]\d) (.*) ([ \d]\d)$/.exec(lines[i]);
    if (!match) break;
    const v = Number(match[1]), body = match[2];
    if (v !== Number(match[3]) || v < 1 || v > 75 || body.length % 2 || !body.length || body.length > 42) throw new Error('Invalid scan row');
    if (previousV !== undefined && previousV - 1 !== v) throw new Error('Noncontiguous scan rows');
    if (width !== undefined && width !== body.length) throw new Error('Inconsistent scan width');
    previousV = v; width = body.length;
    for (let col = 0; col < body.length / 2; col++) {
      const symbol = body.slice(col * 2, col * 2 + 2), h = hmin + col;
      if (h < 1 || h > 75 || ![' .', ' !', '<>', ')(', '??', ' @', '@F', '@E', ' *', '  '].includes(symbol) && !/^ [EFILNSTVYBCDGHJMPW]$/.test(symbol)) throw new Error('Unknown scan symbol or coordinate');
      cells.push({ v, h, symbol, observedAt });
    }
  }
  if (lines[i] !== header || !width || columns.length !== Math.ceil(width / 4) || columns.some((h, index) => h !== hmin + index * 2)) throw new Error('Incomplete scan or inconsistent coordinate labels');
  return { cells, observedAt };
}

export type Devices = Record<'shields' | 'warp' | 'impulse' | 'life' | 'torpedoes' | 'phasers' | 'computer' | 'radio' | 'tractor', number>;
const deviceLabels: Record<string, keyof Devices> = {
  'Deflector Shields': 'shields', 'Warp Engines': 'warp', 'Impulse Engines': 'impulse',
  'Life Support': 'life', 'Torpedo Tubes': 'torpedoes', Phasers: 'phasers',
  Computer: 'computer', Radio: 'radio', 'Tractor Beam': 'tractor',
};

// Full DAMAGES omits healthy devices. Source: DECWAR.FOR:783-836,
// MSG.MAC alldok:6, WARMAC.MAC lngdev:2081-2089. Fail on unknown rows.
export function parseDevices(text: string): Devices {
  const result: Devices = { shields: 0, warp: 0, impulse: 0, life: 0, torpedoes: 0, phasers: 0, computer: 0, radio: 0, tractor: 0 };
  if (/^All devices functional\.\r?$/m.test(text)) return result;
  if (!/^Damage Report for /m.test(text) || !/^Device\s+Damage\r?$/m.test(text)) throw new Error('Incomplete device report');
  const seen = new Set<string>();
  for (const row of text.split(/\r?\n/)) {
    const match = /^([A-Za-z ]+?)\s+(\d+\.\d) units$/.exec(row);
    if (!match) continue;
    const key = deviceLabels[match[1]];
    if (!key || seen.has(key)) throw new Error('Unknown or duplicate device');
    seen.add(key); result[key] = Number(match[2]);
  }
  if (!seen.size) throw new Error('Device report has no damage rows');
  return result;
}
