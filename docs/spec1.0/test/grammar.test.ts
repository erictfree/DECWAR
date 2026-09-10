import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const directory = new URL("../", import.meta.url);
const chapters = readdirSync(directory).filter((name) => /^\d{2}-.*\.md$/.test(name));
const definitions = chapters.flatMap((chapter) => {
  const text = readFileSync(new URL(chapter, directory), "utf8");
  return [...text.matchAll(/```ebnf\s*\n([\s\S]*?)```/g)].flatMap((block) => {
    // Hide terminals and special sequences before finding production boundaries.
    const grammar = block[1].replace(/"[^"\n]*"|\?[^?]*\?/g, " ");
    return [...grammar.matchAll(/([a-z][a-z0-9-]*)\s*=([^;]*);/g)].map((match) => ({
      name: match[1],
      references: match[2].match(/[a-z][a-z0-9-]*/g) ?? [],
      chapter,
    }));
  });
});

test("command entries use readable forms rather than formal productions", () => {
  const entries = readFileSync(new URL("07-command-semantics.md", directory), "utf8");
  assert.doesNotMatch(entries, /```ebnf/);
  const forms = [...entries.matchAll(/```text\n([\s\S]*?)```/g)]
    .flatMap(block => block[1].split("\n"));
  const command = definitions.find(d => d.name === "command")!;
  for (const production of command.references) {
    const spelling = production.replace(/-command$/, "").toUpperCase();
    assert.ok(forms.some(line => line === spelling || line.startsWith(spelling + " ")),
      `${spelling} lacks a readable syntax form`);
  }
  assert.ok(forms.includes("PHASERS [ABSOLUTE | RELATIVE] [<energy>] <vertical> <horizontal>"));
  assert.ok(forms.includes("PHASERS COMPUTED [<energy>] <vessel-name>"));
});

test("preference and ship-report grammars are centralized in the grammar chapter", () => {
  for (const name of ["set-command", "type-command", "damages-command", "status-command", "points-command"]) {
    assert.deepEqual(definitions.filter((d) => d.name === name).map((d) => d.chapter),
      ["04-command-grammar.md"]);
  }
});

test("chapter grammar has single definitions and resolved references", () => {
  assert.ok(definitions.length > 0);
  const names = definitions.map((definition) => definition.name);
  assert.equal(new Set(names).size, names.length, "duplicate production");
  for (const definition of definitions) {
    for (const reference of definition.references) {
      assert.ok(names.includes(reference), `${definition.name}: undefined ${reference}`);
    }
  }
});

test("scan commands share arguments and have centralized productions", () => {
  for (const name of ["scan-command", "srscan-command"]) {
    assert.deepEqual(definitions.filter((d) => d.name === name).map((d) => d.chapter),
      ["04-command-grammar.md"]);
  }
  assert.equal(definitions.find((d) => d.name === "scan-arguments")?.chapter,
    "04-command-grammar.md");
});

test("galaxy-report productions live together in the grammar chapter", () => {
  for (const name of ["list-command", "summary-command", "bases-command", "planets-command", "targets-command"]) {
    assert.deepEqual(definitions.filter((d) => d.name === name).map((d) => d.chapter),
      ["04-command-grammar.md"]);
  }
});

test("REPAIR and DOCK grammars live in the grammar chapter", () => {
  for (const name of ["repair-command", "dock-command"]) {
    assert.deepEqual(definitions.filter((d) => d.name === name).map((d) => d.chapter),
      ["04-command-grammar.md"]);
  }
});

test("CAPTURE and BUILD grammar lives in the grammar chapter", () => {
  for (const name of ["capture-command", "build-command"]) {
    assert.deepEqual(definitions.filter((d) => d.name === name).map((d) => d.chapter),
      ["04-command-grammar.md"]);
  }
});

test("information and departure grammar lives in the grammar chapter", () => {
  for (const name of ["time-command", "users-command", "gripe-command", "quit-command"]) {
    assert.deepEqual(definitions.filter((d) => d.name === name).map((d) => d.chapter),
      ["04-command-grammar.md"]);
  }
});

test("HELP and NEWS grammar lives in the grammar chapter", () => {
  for (const name of ["help-command", "help-topic", "command-topic", "news-command"]) {
    assert.deepEqual(definitions.filter((d) => d.name === name).map((d) => d.chapter),
      ["04-command-grammar.md"]);
  }
});

test("TORPEDOES grammar lives in the grammar chapter", () => {
  for (const name of ["torpedoes-command", "torpedo-arguments", "coordinate-list", "vessel-list", "target-response"]) {
    assert.deepEqual(definitions.filter((d) => d.name === name).map((d) => d.chapter),
      ["04-command-grammar.md"]);
  }
});

test("PHASERS grammar lives in the grammar chapter", () => {
  for (const name of ["phasers-command", "phaser-arguments"]) {
    assert.deepEqual(definitions.filter((d) => d.name === name).map((d) => d.chapter),
      ["04-command-grammar.md"]);
  }
});

test("TELL grammar lives in the grammar chapter", () => {
  for (const name of ["tell-command", "recipients", "recipient", "recipient-group", "message-text", "line-character"]) {
    assert.deepEqual(definitions.filter((d) => d.name === name).map((d) => d.chapter),
      ["04-command-grammar.md"]);
  }
});

test("RADIO grammar lives in the grammar chapter", () => {
  for (const name of ["radio-command", "radio-action"]) {
    assert.deepEqual(definitions.filter((d) => d.name === name).map((d) => d.chapter),
      ["04-command-grammar.md"]);
  }
});

test("ENERGY grammar lives in the grammar chapter", () => {
  for (const name of ["energy-command", "energy-arguments"]) {
    assert.deepEqual(definitions.filter((d) => d.name === name).map((d) => d.chapter),
      ["04-command-grammar.md"]);
  }
});

test("SHIELDS action grammar lives in the grammar chapter", () => {
  for (const name of ["shields-command", "shield-action"]) {
    assert.deepEqual(definitions.filter((d) => d.name === name).map((d) => d.chapter),
      ["04-command-grammar.md"]);
  }
});

test("MOVE grammar lives in the grammar chapter without changing its form", () => {
  const move = definitions.filter((definition) => definition.name === "move-command");
  assert.deepEqual(move.map((definition) => definition.chapter), ["04-command-grammar.md"]);
  const entry = readFileSync(new URL("04-command-grammar.md", directory), "utf8");
  assert.match(entry, /move-command = "MOVE", \[ destination \| coordinate-mode \] ;/);
  const command = definitions.find((definition) => definition.name === "command");
  assert.equal(command?.references.length, 31);
  assert.ok(command?.references.includes("move-command"));
});

test("IMPULSE grammar lives in the grammar chapter without changing its form", () => {
  const impulse = definitions.filter((definition) => definition.name === "impulse-command");
  assert.deepEqual(impulse.map((definition) => definition.chapter), ["04-command-grammar.md"]);
  const entry = readFileSync(new URL("04-command-grammar.md", directory), "utf8");
  assert.match(entry, /impulse-command = "IMPULSE", \[ destination \| coordinate-mode \] ;/);
});

test("TRACTOR grammar and prompted response live in the grammar chapter", () => {
  for (const name of ["tractor-command", "tractor-response"]) {
    assert.deepEqual(
      definitions.filter((definition) => definition.name === name).map((definition) => definition.chapter),
      ["04-command-grammar.md"],
    );
  }
  const entry = readFileSync(new URL("04-command-grammar.md", directory), "utf8");
  assert.match(entry, /tractor-command = "TRACTOR", \[ "OFF" \| roster-name \] ;/);
});
