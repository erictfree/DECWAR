export type CapturedCase = { index: number; id?: string; command: string; response: string; passed?: boolean };
export function compareCases(left: CapturedCase[], right: CapturedCase[], ignoreCommandEcho = false) {
  const byId = [...left, ...right].every(c => typeof c.id === 'string' && c.id.length > 0);
  const key = (c: CapturedCase) => byId ? c.id! : String(c.index);
  const map = (cases: CapturedCase[]) => {
    const m = new Map<string, CapturedCase>();
    for (const c of cases) {
      if (!Number.isInteger(c.index) || typeof c.command !== 'string' || typeof c.response !== 'string') throw new Error('Invalid captured case');
      if (m.has(key(c))) throw new Error(`Duplicate case ${key(c)}`);
      m.set(key(c), c);
    }
    return m;
  };
  const a = map(left), b = map(right);
  const strip = (c: CapturedCase) => {
    // Strip only one exact nonempty leading sent line, never game whitespace.
    const prefix = c.command + '\r\n';
    const removed = ignoreCommandEcho && c.command.length > 0 && c.response.startsWith(prefix) ? prefix : '';
    return { text: c.response.slice(removed.length), removed };
  };
  return { pairing: byId ? 'stable-case-id' : 'legacy-index', ignoreCommandEcho,
    cases: [...new Set([...a.keys(), ...b.keys()])].map(id => {
      const l = a.get(id), r = b.get(id);
      if (!l || !r) return { id, command: (l ?? r)!.command, result: 'missing-case', missing: l ? 'right' : 'left' };
      if (l.command !== r.command) return { id, result: 'different-command', left: l, right: r };
      const ls = strip(l), rs = strip(r);
      const exact = l.response === r.response, equal = ls.text === rs.text;
      let offset = 0;
      while (offset < Math.min(ls.text.length, rs.text.length) && ls.text[offset] === rs.text[offset]) offset++;
      return { id, command: l.command,
        result: l.passed === false || r.passed === false ? 'failed-expectation' : exact ? 'exact-decoded-match' : equal ? 'command-echo-only' : 'needs-review',
        firstDifference: equal ? null : offset,
        removedEcho: { left: ls.removed, right: rs.removed }, left: l.response, right: r.response };
    }) };
}
