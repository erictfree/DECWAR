import assert from "node:assert/strict";
import test from "node:test";
import { energyDialogue } from "../src/energy-validation.ts";
import type { EnergyInputToken } from "../src/energy-validation.ts";

const ships = [
  {name:"EXCALIBUR" as const,lifecycle:{phase:"COMMISSIONED" as const,captain:"A"},
    position:{vertical:20,horizontal:20},energy:1000},
  {name:"FARRAGUT" as const,lifecycle:{phase:"COMMISSIONED" as const,captain:"B"},
    position:{vertical:20,horizontal:21},energy:2000},
];
const word=(text:string):EnergyInputToken=>({kind:"WORD",text});
const integer=(value:number):EnergyInputToken=>({kind:"INTEGER",value});

test("missing amount requests a replacement pair, not just the amount",()=>{
  const before=structuredClone(ships);
  assert.deepEqual(energyDialogue(ships,"EXCALIBUR",[word("FARRAGUT")],
    [[integer(100)],[word("f"),integer(100)]],"SHORT"), {
    status:"READY",recipient:"FARRAGUT",amount:100,responsesUsed:2,
    output:"\nShip, energy: Ship, energy: "});
  assert.deepEqual(ships,before);
});

test("decimal-class amount retries; empty reply cancels without validating a name",()=>{
  assert.deepEqual(energyDialogue(ships,"EXCALIBUR",[word("ZZZ"),{kind:"OTHER"}],
    [[]],"LONG"),{status:"CANCELLED",responsesUsed:1,
    output:"\nDestination ship name and energy to transfer: "});
});

test("a well-shaped but invalid pair ends the dialogue without another retry",()=>{
  assert.deepEqual(energyDialogue(ships,"EXCALIBUR",[],
    [[word("ZZZ"),integer(100)],[word("F"),integer(100)]],"MEDIUM"), {
    status:"REJECTED",responsesUsed:1,output:"\nShip, energy: Unknown ship name.\n"});
});

test("trailing operands are ignored after a complete pair; no response is consumed",()=>{
  assert.deepEqual(energyDialogue(ships,"EXCALIBUR",[word("F"),integer(100),word("NO")],
    [[]],"LONG"),{status:"READY",recipient:"FARRAGUT",amount:100,responsesUsed:0,output:"\n"});
  assert.deepEqual(energyDialogue(ships,"EXCALIBUR",[],[],"SHORT"),
    {status:"PROMPT",responsesUsed:0,output:"\nShip, energy: "});
});
