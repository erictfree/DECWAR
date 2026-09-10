import type { PlayerPreferences } from "./model.ts";

// Section 7.5: first-token selection, with null for omitted/empty input.
// Raw tokenization, echo, terminal suffix and version banner remain separate.
export function typeSelection(initial: string | null, responses: readonly (string | null)[]):
  { status: "PROMPT" | "CANCELLED"; output: string; responsesUsed: number }
  | { status: "SELECTED"; selection: "OUTPUT" | "OPTION"; output: string; responsesUsed: number } {
  let word = initial?.toUpperCase() ?? "";
  let output = "", responsesUsed = 0;
  while (true) {
    if (word === "O") output += "\nAmbiguous switch for TYPE.\n";
    else if (word) {
      for (const selection of ["OUTPUT", "OPTION"] as const) {
        if (selection.startsWith(word)) return { status: "SELECTED", selection, output, responsesUsed };
      }
    }
    output += "\nDo you wish to see the OUTPUT or OPTION switches? ";
    if (responsesUsed === responses.length) return { status: "PROMPT", output, responsesUsed };
    const response = responses[responsesUsed++];
    if (response === null || response === "") return { status: "CANCELLED", output, responsesUsed };
    word = response.toUpperCase();
  }
}

const settings = {
  OUTPUT: { property: "outputLength", values: ["SHORT", "MEDIUM", "LONG"] },
  SCANS: { property: "scanLength", values: ["SHORT", "LONG"] },
  PROMPT: { property: "promptStyle", values: ["NORMAL", "INFORMATIVE"] },
  ICDEF: { property: "coordinateInput", values: ["ABSOLUTE", "RELATIVE"] },
  OCDEF: { property: "coordinateOutput", values: ["ABSOLUTE", "RELATIVE", "BOTH"] },
} as const;

// Ordinary, tokenized SET dialogue. NAME/TTYTYPE are explicit scope guards;
// privileged settings are not available in this ordinary-player operation.
export function setDialogue(current: PlayerPreferences,
  initial: readonly (string | number)[], responses: readonly (readonly (string | number)[])[]) {
  let tokens = initial, output = "", responsesUsed = 0;
  const word = (v: string | number | undefined) => typeof v === "string" && /^[a-z]+$/i.test(v) ? v.toUpperCase() : null;
  const settingPrompt = "\nName, Output, Ttytype, Prompt, Scans,\nInput or Output location defaults (ICDEF, OCDEF)? ";
  const prompts = {
    OUTPUT: "\nShort, Medium, or Long output? ",
    SCANS: "\nShort or Long scans? ",
    PROMPT: "\nNormal or Informative command prompt? ",
    ICDEF: "\nAbsolute or Relative default for location input? ",
    OCDEF: "\nAbsolute, Relative, or Both for location output? ",
  };
  const finish = (status: "PROMPT" | "DONE", preferences = {...current}) =>
    ({status,preferences,output,responsesUsed});
  while (true) {
    const input = word(tokens[0]);
    const setting = input && ["NAME","OUTPUT","TTYTYPE","PROMPT","SCANS","ICDEF","OCDEF"]
      .find(s=>s.startsWith(input));
    if (!setting) {
      output += settingPrompt;
      if (responsesUsed === responses.length) return finish("PROMPT");
      tokens = responses[responsesUsed++];
      if (!tokens.length) return finish("DONE");
      continue;
    }
    if (setting === "NAME" || setting === "TTYTYPE") throw new Error("C-011 name/terminal semantics outside this companion");
    const selected = setting as keyof typeof settings;
    let value = word(tokens[1]);
    while (!value) {
      output += prompts[selected];
      if (responsesUsed === responses.length) return finish("PROMPT");
      tokens = responses[responsesUsed++];
      if (!tokens.length) return finish("DONE");
      value = word(tokens[0]);
    }
    return finish("DONE",setPreference(current,selected,value));
  }
}

// Section 7.4: a resolved setting and one word value, without prompting.
export function setPreference(current: PlayerPreferences, setting: keyof typeof settings,
  word: string): PlayerPreferences {
  if (!/^[a-z]+$/i.test(word)) throw new Error("word value required; prompting is separate");
  const { property, values } = settings[setting];
  const value = values.find(candidate => candidate.startsWith(word.toUpperCase()));
  return value ? { ...current, [property]: value } : { ...current };
}

// Section 7.5: the five game-facing lines, not the unresolved terminal suffix.
export function preferenceReport(preferences: PlayerPreferences): string {
  const title = (word: string) => word[0] + word.slice(1).toLowerCase();
  return "\nCurrent output switch settings:\n\n"
    + title(preferences.outputLength) + " output format.\n"
    + title(preferences.promptStyle) + " command prompt.\n"
    + title(preferences.scanLength) + " SCAN format.\n"
    + title(preferences.coordinateInput) + " coordinates are default for input.\n"
    + title(preferences.coordinateOutput) + " coordinates are default for output.\n";
}
