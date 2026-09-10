import { readFileSync } from 'node:fs';
import { noticeSequence, noticeChecks, energyNotices, type NoticeStep } from './energy-notices.ts';
const paths = process.argv.slice(2);
if (paths.length !== 2) throw Error('Usage: review-energy-notices.ts TYPESCRIPT_JSONL PDP10_JSONL');
const captures = paths.map((path, i) => {
  const events = readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const config = events.find(e => e.event === 'configuration');
  const errors = events.filter(e => ['failed','cleanup-error'].includes(e.event)).map(e => e.error);
  if (config?.scenario !== 'energy-notices-v1' || config?.backend !== (i ? 'pdp10' : 'typescript') || config?.seed !== 1729) errors.push('Invalid configuration');
  if (!events.some(e => e.event === 'sent' && e.line === 'TOURNAMENT 1729')) errors.push('Missing seed selection');
  if (!events.some(e => e.event === 'complete') || !['Donor','Receiver'].every(role => events.some(e => e.event === 'cleanup-complete' && e.role === role))) errors.push('Incomplete lifecycle');
  const steps: NoticeStep[] = events.filter(e => e.event === 'assistance-step');
  if (steps.length !== noticeSequence.length || noticeSequence.some(([label,command], n) => steps[n]?.label !== label || steps[n]?.command !== command)) errors.push('Incomplete or reordered sequence');
  return { path, errors, steps };
});
const clean = (text: string, command: string) => text.startsWith(command+'\r\n') ? text.slice(command.length+2) : text;
const reports = noticeSequence.map(([label,command],index) => {
  const steps = captures.map(c => c.steps[index]);
  if (steps.some(s => !s)) return {label,evidence:false};
  return {label,evidence:true, checks:steps.map(s => noticeChecks(s,index)),
    responseEqual:clean(steps[0].response,command)===clean(steps[1].response,command),
    recipientNotices:steps.map(s=>energyNotices(s.after.receiver.text))};
});
const outcome = captures.some(c=>c.errors.length) ? 'incomplete' : reports.every(r=>r.evidence && r.responseEqual && r.checks!.every(c=>Object.values(c).every(Boolean))) ? 'matched-energy-notices' : 'differences';
console.log(JSON.stringify({scenario:'energy-notices-v1',outcome,captures:captures.map(({path,errors})=>({path,errors})),reports,
  scope:'Exact selected ENERGY recipient notices and radio-control responses, restored supply contracts, radio status, positions and unchanged non-energy supplies. No private flags, damaged-radio, TELL filtering, or all output-mode claim.'},null,2));
process.exitCode = outcome==='incomplete'?2:outcome==='differences'?1:0;
