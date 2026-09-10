import assert from "node:assert/strict";
import test from "node:test";
import { lexicalSegment } from "../src/lexical.ts";
import { ordinaryCommands, recognizeOrdinaryCommand, recognitionDiagnostic } from "../src/command-recognition.ts";

test("every documented minimum and longer canonical prefix selects its command", () => {
  const minima = ["BA", "BU", "C", "DA", "DO", "E", "G", "H", "I", "L", "M", "N",
    "PH", "PL", "PO", "Q", "RA", "RE", "SC", "SE", "SH", "SR", "ST", "SU", "TA", "TE",
    "TI", "TO", "TR", "TY", "U"];
  assert.equal(ordinaryCommands.length, 31);
  ordinaryCommands.forEach((command, index) => {
    assert.ok(command.startsWith(minima[index]));
    for (let n = minima[index].length; n <= command.length; n++)
      assert.deepEqual(recognizeOrdinaryCommand({ kind: "WORD", text: command.slice(0, n).toLowerCase() }),
        { kind: "COMMAND", command });
  });
});

test("ambiguous initial letters do not choose the first available command", () => {
  const groups = { B: ["BASES", "BUILD"], D: ["DAMAGES", "DOCK"], P: ["PHASERS", "PLANETS", "POINTS"],
    R: ["RADIO", "REPAIR"], S: ["SCAN", "SET", "SHIELDS", "SRSCAN", "STATUS", "SUMMARY"],
    T: ["TARGETS", "TELL", "TIME", "TORPEDOES", "TRACTOR", "TYPE"] };
  for (const [text, candidates] of Object.entries(groups))
    assert.deepEqual(recognizeOrdinaryCommand({ kind: "WORD", text }), { kind: "AMBIGUOUS", candidates });
});

test("torpedo spellings deduplicate to one command rather than competing aliases", () => {
  for (const text of ["TO", "TORPEDO", "TORPEDOS", "TORPEDOES"])
    assert.deepEqual(recognizeOrdinaryCommand({ kind: "WORD", text }), { kind: "COMMAND", command: "TORPEDOES" });
});

test("written input distinguishes empty, unknown, ambiguous and recognized command heads", () => {
  for (const [line, kind] of [[" ;comment", "EMPTY"], ["M20", "UNKNOWN"], ["123", "UNKNOWN"],
    ["ZZZ", "UNKNOWN"], ["*PASSWORD", "UNKNOWN"], ["S", "AMBIGUOUS"], ["m 20.0 21", "COMMAND"]]) {
    const segment = lexicalSegment(line);
    assert.equal(segment.status, "TOKENS");
    if (segment.status !== "TOKENS") continue;
    assert.equal(recognizeOrdinaryCommand(segment.tokens[0]).kind, kind);
  }
});

test("recognition diagnostics are exact and do not print candidate lists", () => {
  for (const text of ["ZZZ", "S"]) {
    const result = recognizeOrdinaryCommand({ kind: "WORD", text });
    const message = text === "S" ? "Ambiguous command" : "Unknown command";
    assert.equal(recognitionDiagnostic(result, "SHORT"), message + "\n");
    for (const length of ["MEDIUM", "LONG"] as const)
      assert.equal(recognitionDiagnostic(result, length), message + " -- for help type HELP\n");
  }
  assert.equal(recognitionDiagnostic({ kind: "EMPTY" }, "LONG"), "");
  assert.equal(recognitionDiagnostic({ kind: "COMMAND", command: "MOVE" }, "LONG"), "");
});
