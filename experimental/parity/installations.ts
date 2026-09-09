import { PlayerClient } from '../automated-player/client.ts';
import { parseStatus, parseScan, parseDevices } from '../automated-player/observations.ts';

type RecordEvent = (event: Record<string, unknown>) => void;
// Seed1729 public fixture: Empire base15,10 and neutral planet19,14.
// Austin PHACON, TORDAM/PHADAM, BUILD523–591, CAPTUR600–684, DOCK893–938.
export async function captureInstallations(attacker: PlayerClient, builder: PlayerClient, record: RecordEvent) {
  async function state(client: PlayerClient) {
    const statusText = await client.command('STATUS'), scanText = await client.command('SCAN 10');
    return { statusText, scanText, status: parseStatus(statusText), scan: parseScan(scanText), bases: await client.command('BASES'), planets: await client.command('PLANETS'), damages: await client.command('DAMAGES'), points: await client.command('POINTS') };
  }
  const symbol = (s: Awaited<ReturnType<typeof state>>, v: number, h: number) => s.scan.cells.find(c => c.v === v && c.h === h)?.symbol;
  record({ event: 'siege-shields', response: await attacker.command('SHIELDS DOWN') });
  let destroyed = false;
  for (let shot = 0; shot < 25; shot++) {
    const before = await state(attacker);
    if (symbol(before, 15, 10) !== ')(' || before.status.energy < 500 || before.status.hullDamage > 0 || parseDevices(before.damages).phasers > 0) throw new Error('Unsafe siege fixture');
    const command = 'PHASERS ABSOLUTE 180 15 10', response = await attacker.command(command), after = await state(attacker);
    record({ event: 'base-shot', shot, command, response, before, after });
    if (symbol(after, 15, 10) === ' .') { destroyed = true; break; }
  }
  if (!destroyed) throw new Error('Base survived bounded siege');
  record({ event: 'base-destroyed', builder: await state(builder) });
  // Fixed clear approach, with fresh cell checks; enter the neutral planet's
  // defense radius only for the capture. Never route through the planet.
  for (const [v, h] of [[11,11],[12,12],[13,13],[14,14],[15,14],[16,14],[17,14],[18,14]]) {
    const before = await state(builder);
    if (symbol(before, v, h) !== ' .' || before.status.energy < 2500 || before.status.hullDamage > 500) throw new Error('Builder approach unsafe');
    const command = `MOVE ABSOLUTE ${v} ${h}`, response = await builder.command(command);
    record({ event: 'builder-move', command, response });
  }
  let before = await state(builder);
  if (symbol(before, 19, 14) !== ' @') throw new Error('Expected neutral planet missing');
  const command = 'CAPTURE ABSOLUTE 19 14', response = await builder.command(command);
  let after = await state(builder);
  record({ event: 'installation-capture', command, response, before, after });
  if (symbol(after, 19, 14) !== '@E') throw new Error('Empire capture unconfirmed');
  for (let build = 1; build <= 5; build++) {
    before = after;
    const command = 'BUILD ABSOLUTE 19 14', response = await builder.command(command);
    after = await state(builder);
    record({ event: 'installation-build', build, command, response, before, after });
    if (symbol(after, 19, 14) !== (build === 5 ? ')(' : '@E')) throw new Error('Build/conversion unconfirmed');
  }
  before = after;
  const dockResponse = await builder.command('DOCK');
  after = await state(builder);
  record({ event: 'installation-dock', command: 'DOCK', response: dockResponse, before, after });
  if (!after.status.docked || after.status.energy <= before.status.energy) throw new Error('New-base docking did not replenish energy');
}
