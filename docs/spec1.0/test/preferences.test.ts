import assert from "node:assert/strict";
import test from "node:test";
import type { PlayerPreferences } from "../src/model.ts";
import { setPreference, preferenceReport, typeSelection, setDialogue } from "../src/preferences.ts";

const initial: PlayerPreferences = { outputLength: "MEDIUM", scanLength: "SHORT",
  promptStyle: "NORMAL", coordinateInput: "ABSOLUTE", coordinateOutput: "ABSOLUTE" };

const typePrompt = "\nDo you wish to see the OUTPUT or OPTION switches? ";

test("SET resolves O versus OC and applies exactly one preference",()=>{
  assert.deepEqual(setDialogue(initial,["O","S"],[]),{status:"DONE",preferences:{...initial,outputLength:"SHORT"},output:"",responsesUsed:0});
  assert.equal(setDialogue(initial,["OC","B"],[]).preferences.coordinateOutput,"BOTH");
});

test("SET setting prompt accepts a setting/value pair, value prompt accepts value alone",()=>{
  const result=setDialogue(initial,[],[["OUTPUT"],[12],["S"]]);
  assert.equal(result.responsesUsed,3);
  assert.equal(result.preferences.outputLength,"SHORT");
  assert.equal(result.output,"\nName, Output, Ttytype, Prompt, Scans,\nInput or Output location defaults (ICDEF, OCDEF)? "+"\nShort, Medium, or Long output? ".repeat(2));
});

test("SET unknown word value ends unchanged instead of retrying",()=>{
  assert.deepEqual(setDialogue(initial,["OUTPUT"],[["BRIEF"],["SHORT"]]), {
    status:"DONE",preferences:initial,output:"\nShort, Medium, or Long output? ",responsesUsed:1});
});

test("SET blank value cancels and NAME cannot silently change a preference",()=>{
  assert.deepEqual(setDialogue(initial,["SCANS"],[[]]),{
    status:"DONE",preferences:initial,output:"\nShort or Long scans? ",responsesUsed:1});
  assert.throws(()=>setDialogue(initial,["N","Alex"],[]),/C-011/);
});
test("TYPE accepts each unambiguous ordinary prefix without prompting", () => {
  for (const selection of ["OUTPUT","OPTION"] as const) {
    for (let n=2;n<=selection.length;n++) assert.deepEqual(typeSelection(selection.slice(0,n).toLowerCase(),[]),
      {status:"SELECTED",selection,output:"",responsesUsed:0});
  }
});

test("TYPE ambiguity is reported before the prompt and blank cancellation", () => {
  assert.deepEqual(typeSelection("O",[null]),{status:"CANCELLED",responsesUsed:1,
    output:"\nAmbiguous switch for TYPE.\n"+typePrompt});
});

test("TYPE retries non-words and unknown words without ambiguity diagnostics", () => {
  assert.deepEqual(typeSelection(null,["123","ZZZ","OP","OU"]), {
    status:"SELECTED",selection:"OPTION",responsesUsed:3,output:typePrompt.repeat(3)});
  assert.deepEqual(typeSelection(null,[]),{status:"PROMPT",responsesUsed:0,output:typePrompt});
});

test("prompted TYPE OUTPUT connects to the preference report without changing preferences", () => {
  const before=structuredClone(initial);
  const choice=typeSelection(null,["OU"]);
  assert.equal(choice.status,"SELECTED");
  assert.equal(choice.output+preferenceReport(initial),typePrompt+
    "\nCurrent output switch settings:\n\nMedium output format.\nNormal command prompt.\nShort SCAN format.\nAbsolute coordinates are default for input.\nAbsolute coordinates are default for output.\n");
  assert.deepEqual(initial,before);
});

test("every SET preference value and prefix changes only its designated property", () => {
  const choices = [
    ["OUTPUT", "outputLength", ["SHORT", "MEDIUM", "LONG"]],
    ["SCANS", "scanLength", ["SHORT", "LONG"]],
    ["PROMPT", "promptStyle", ["NORMAL", "INFORMATIVE"]],
    ["ICDEF", "coordinateInput", ["ABSOLUTE", "RELATIVE"]],
    ["OCDEF", "coordinateOutput", ["ABSOLUTE", "RELATIVE", "BOTH"]],
  ] as const;
  for (const [setting, property, values] of choices) {
    for (const value of values) {
      for (let n = 1; n <= value.length; n++) {
        assert.deepEqual(setPreference(initial, setting, value.slice(0, n).toLowerCase()),
          { ...initial, [property]: value });
      }
    }
  }
  assert.equal(initial.outputLength, "MEDIUM");
});

test("unrecognized word value leaves preferences unchanged", () => {
  assert.deepEqual(setPreference(initial, "OUTPUT", "BRIEF"), initial);
  assert.deepEqual(setPreference(initial, "ICDEF", "BOTH"), initial);
});

test("SET followed by TYPE exposes the changed setting without abbreviated report text", () => {
  const preferences = setPreference(setPreference(initial, "OUTPUT", "S"), "OCDEF", "B");
  assert.equal(preferenceReport(preferences), "\nCurrent output switch settings:\n\nShort output format.\nNormal command prompt.\nShort SCAN format.\nAbsolute coordinates are default for input.\nBoth coordinates are default for output.\n");
});
