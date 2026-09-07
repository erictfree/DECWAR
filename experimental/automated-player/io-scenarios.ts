// Austin DECWAR.FOR:3627–3718, MSG.MAC:259–279.
// These are player dialogue scenarios, not privileged world fixtures.
export type IoStep = { id: string; command: string; prompt?: string; contains?: string };
export type IoGroup = { id: string; steps: IoStep[] };
const choices: Record<string, string[]> = {
  OUTPUT: ['SHORT', 'MEDIUM', 'LONG'], PROMPT: ['NORMAL', 'INFORMATIVE'],
  SCANS: ['SHORT', 'LONG'], ICDEF: ['ABSOLUTE', 'RELATIVE'],
  OCDEF: ['ABSOLUTE', 'RELATIVE', 'BOTH'],
  TTYTYPE: ['ACT-IV', 'ADM-2', 'ADM-3a', 'DATAPOINT', 'ACT-V', 'SOROC', 'BEEHIVE', 'CRT'],
};
const prompts: Record<string, string> = {
  OUTPUT: 'Short, Medium, or Long output? ', PROMPT: 'Normal or Informative command prompt? ',
  SCANS: 'Short or Long scans? ', ICDEF: 'Absolute or Relative default for location input? ',
  OCDEF: 'Absolute, Relative, or Both for location output? ', TTYTYPE: 'Terminal type:  ',
};
export function settingText(setting: string, value: string): string {
  const title = value[0] + value.slice(1).toLowerCase();
  return ({ OUTPUT: `${title} output format.`, PROMPT: `${title} command prompt.`,
    SCANS: `${title} SCAN format.`, ICDEF: `${title} coordinates are default for input.`,
    OCDEF: `${title} coordinates are default for output.`, TTYTYPE: `Terminal type:  ${value.toUpperCase()}` })[setting]!;
}
export function ioScenarios(suite: 'modes' | 'dialogs'): IoGroup[] {
  const groups: IoGroup[] = [];
  function add(id: string, steps: Omit<IoStep, 'id'>[]) {
    groups.push({ id, steps: steps.map((s, i) => ({ ...s, id: `${suite}/${id}/${i + 1}` })) });
  }
  if (suite === 'modes') {
    add('defaults', [{ command: 'TYPE OUTPUT' }]);
    for (const [setting, values] of Object.entries(choices)) for (const value of values) {
      add(`${setting}/${value}`, [
        { command: `SET ${setting} ${value}` },
        { command: 'TYPE OUTPUT', contains: settingText(setting, value) },
        { command: setting === 'SCANS' || setting === 'TTYTYPE' ? 'SCAN 3' : 'STATUS' },
      ]);
    }
  } else {
    // Each group ends at a game prompt; limits never strand a continuation.
    for (const [setting, values] of Object.entries(choices)) {
      const value = values.at(-1)!;
      add(`${setting}/interactive`, [
        { command: `SET ${setting}`, prompt: prompts[setting] }, { command: value },
        { command: 'TYPE OUTPUT', contains: settingText(setting, value) },
      ]);
      add(`${setting}/blank`, [
        { command: `SET ${setting}`, prompt: prompts[setting] }, { command: '' },
        { command: 'TYPE OUTPUT', contains: settingText(setting, value) },
      ]);
      // Non-terminal invalid alphabetic values return unchanged in SET.
      // TTYTYPE retries and clears ttytyp; restore a valid choice explicitly.
      add(`${setting}/invalid`, setting === 'TTYTYPE' ? [
        { command: 'SET TTYTYPE ZZZZZ', prompt: prompts.TTYTYPE, contains: 'Supported TTY types are:' },
        { command: 'CRT' }, { command: 'TYPE OUTPUT', contains: settingText('TTYTYPE', 'CRT') },
      ] : [
        { command: `SET ${setting} ZZZZZ` }, { command: 'TYPE OUTPUT', contains: settingText(setting, value) },
      ]);
    }
    add('switch-prompt', [
      { command: 'SET', prompt: 'Input or Output location defaults (ICDEF, OCDEF)? ' },
      { command: 'OUTPUT', prompt: prompts.OUTPUT }, { command: 'SHORT' },
      { command: 'TYPE OUTPUT', contains: settingText('OUTPUT', 'SHORT') },
    ]);
    add('ambiguous-terminal', [
      { command: 'SET TTYTYPE ACT', prompt: prompts.TTYTYPE, contains: 'Ambiguous TTY type.' },
      { command: 'CRT' }, { command: 'TYPE OUTPUT', contains: settingText('TTYTYPE', 'CRT') },
    ]);
    add('abbreviations', [
      { command: 'SE OU ME' }, { command: 'TYPE OUTPUT', contains: settingText('OUTPUT', 'MEDIUM') },
    ]);
  }
  return groups;
}

export function selectGroups(groups: IoGroup[], limit: number): IoGroup[] {
  const selected: IoGroup[] = []; let count = 0;
  for (const group of groups) {
    if (count + group.steps.length > limit) break;
    selected.push(group); count += group.steps.length;
  }
  return selected;
}
