import { parseArgs } from 'node:util';
import { playerCommands } from './commands.ts';

const { values } = parseArgs({ options: { format: { type: 'string', default: 'markdown' }, help: { type: 'boolean' } } });
if (values.help) {
  console.log('Usage: node experimental/automated-player/command-coverage.ts [--format markdown|json]');
  process.exit(0);
}
if (values.format === 'json') console.log(JSON.stringify({ source: 'legacy/utexas/DECWAR.FOR:437-471', count: playerCommands.length, commands: playerCommands }, null, 2));
else if (values.format === 'markdown') {
  console.log('| Command | Coverage | Role | Bot use |\n| --- | --- | --- | --- |');
  for (const command of playerCommands) console.log(`| ${command.name} | ${command.coverage} | ${command.role} | ${command.use} |`);
} else throw new Error(`Invalid format: ${values.format}`);
