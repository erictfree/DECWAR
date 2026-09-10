import assert from "node:assert/strict";
import test from "node:test";
import { collectGripe } from "../src/gripe.ts";
import type { GripeLine } from "../src/gripe.ts";

const prompt = "Enter gripe, end with ^Z\n";
const full = (n: number): GripeLine[] => Array.from({length:n}, () => ({text:"",end:"NEWLINE"}));

test("RED rejects before collection; pregame has no alert rejection", () => {
  assert.deepEqual(collectGripe("RED", [{text:"ignored",end:"END"}]), {
    status:"REJECTED",output:"\nYou are not permitted to GRIPE\nwhile under RED alert!\n"});
  assert.deepEqual(collectGripe(null, []), {status:"COLLECTING",draft:"",output:prompt});
});

test("empty END differs from a submitted blank line", () => {
  assert.deepEqual(collectGripe("GREEN",[{text:"",end:"END"}]),{status:"EMPTY",output:prompt});
  assert.deepEqual(collectGripe("GREEN",[...full(1),{text:"",end:"END"}]),
    {status:"SUBMIT",body:"\n",output:prompt});
});

test("body is literal and final nonempty unterminated text receives one newline", () => {
  assert.deepEqual(collectGripe("YELLOW",[
    {text:"MOVE failed / please investigate",end:"NEWLINE"},
    {text:"keep Case",end:"END"}]), {
      status:"SUBMIT",body:"MOVE failed / please investigate\nkeep Case\n",output:prompt});
});

test("cancellation discards the entire draft but retains prior warning output", () => {
  assert.deepEqual(collectGripe("GREEN",[...full(18),{text:"partial",end:"CANCEL"}]),
    {status:"CANCELLED",output:prompt+"[Only 2 more message lines allowed]\n"});
});

test("twenty completed lines finish automatically and leave later input unconsumed", () => {
  assert.deepEqual(collectGripe("GREEN",[...full(20),{text:"not feedback",end:"END"}]), {
    status:"SUBMIT",body:"\n".repeat(20),
    output:prompt+"[Only 2 more message lines allowed]\n[Too many lines -- end of gripe]\n"});
});

test("END on the eighteenth or twentieth line bypasses the corresponding limit message", () => {
  for (const n of [18,20]) assert.deepEqual(
    collectGripe("GREEN",[...full(n-1),{text:"last",end:"END"}]), {
      status:"SUBMIT",body:"\n".repeat(n-1)+"last\n",
      output:prompt+(n===20?"[Only 2 more message lines allowed]\n":"")});
});
