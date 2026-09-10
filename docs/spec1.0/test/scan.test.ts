import assert from "node:assert/strict";
import test from "node:test";
import type { Base, Planet } from "../src/model.ts";
import { scanBounds, scanDiscovery, scanOutput, scanRequest } from "../src/scan.ts";

const position = { vertical: 20, horizontal: 20 };

test("scan interruption completes the current row and omits remaining rows and footer",()=>{
  const bounds=scanBounds(position,1);
  const full=scanOutput(bounds,false,()=>" .");
  assert.equal(scanOutput(bounds,false,()=>" .",[],1),"\n   19  21\n21  . . . 21\n");
  assert.equal(scanOutput(bounds,false,()=>" .",[],2),"\n   19  21\n21  . . . 21\n20  . . . 20\n");
  assert.equal(scanOutput(bounds,false,()=>" .",[],3),full.slice(0,-"   19  21\n".length));
  assert.equal(scanOutput(bounds,false,()=>" .",[],4),full);
});

test("interrupting visible rows does not roll back discovery outside the displayed rectangle",()=>{
  const planets:Planet[]=[{position:{vertical:30,horizontal:30},allegiance:"NEUTRAL",construction:0,knownTo:new Set()}];
  const warnings=scanDiscovery(position,"FEDERATION",planets,[]);
  scanOutput(scanBounds(position,1),false,()=>" .",warnings,1);
  assert.ok(planets[0].knownTo.has("FEDERATION"));
});

test("SCAN direction, signed CORNER ranges and final WARNING connect to bounds",()=>{
  assert.deepEqual(scanRequest(position,["c",-2,3,"w"]),{
    status:"EXPLICIT",warning:true,bounds:{verticalMin:18,verticalMax:20,horizontalMin:20,horizontalMax:23}});
  assert.deepEqual(scanRequest(position,["u",2]),{
    status:"EXPLICIT",warning:false,bounds:{verticalMin:20,verticalMax:22,horizontalMin:18,horizontalMax:22}});
});

test("SCAN rejects misplaced warning, wrong counts and noninteger token classes",()=>{
  for (const operands of [["WARNING",2],[2,"WARNING",3],["CORNER",2],[1,2,3],["2.0"],[2.5],["UP","DOWN",2]])
    assert.deepEqual(scanRequest(position,operands),{status:"ERROR",output:"%Syntax error\n"});
});

test("SCAN missing ranges remain distinct from explicit zero",()=>{
  assert.deepEqual(scanRequest(position,["LEFT","WARNING"]),{status:"DEFAULT",direction:"LEFT",warning:true});
  assert.deepEqual(scanRequest(position,[0]),{status:"EXPLICIT",warning:false,
    bounds:{verticalMin:20,verticalMax:20,horizontalMin:20,horizontalMax:20}});
});
test("explicit scan ranges preserve direction, negative and clipping rules", () => {
  assert.deepEqual(scanBounds(position, -2, 3), { verticalMin: 20, verticalMax: 20, horizontalMin: 17, horizontalMax: 23 });
  assert.deepEqual(scanBounds(position, -2, 3, "CORNER"), { verticalMin: 18, verticalMax: 20, horizontalMin: 20, horizontalMax: 23 });
  assert.deepEqual(scanBounds(position, 2, 3, "UP"), { verticalMin: 20, verticalMax: 22, horizontalMin: 17, horizontalMax: 23 });
  assert.deepEqual(scanBounds({ vertical: 1, horizontal: 75 }, 50), { verticalMin: 1, verticalMax: 11, horizontalMin: 65, horizontalMax: 75 });
});

test("SCAN worked grid matches the specification", () => {
  const symbols: Record<string, string> = { "22,18": " *", "21,19": "<>",
    "20,20": " E", "20,22": " @", "19,21": " W" };
  const request = scanRequest(position, [2]);
  assert.equal(request.status, "EXPLICIT");
  if (request.status !== "EXPLICIT") throw new Error("explicit sample required");
  const output = scanOutput(request.bounds, false, p => symbols[`${p.vertical},${p.horizontal}`] ?? " .");
  assert.equal(output, "\n   18  20  22\n22  * . . . . 22\n21  .<> . . . 21\n20  . . E . @ 20\n19  . . . W . 19\n18  . . . . . 18\n   18  20  22\n");
});

test("discovery extends beyond display and warning marks only empty sectors", () => {
  const planets: Planet[] = [
    { position: { vertical: 23, horizontal: 20 }, allegiance: "EMPIRE", construction: 0, knownTo: new Set() },
    { position: { vertical: 30, horizontal: 30 }, allegiance: "NEUTRAL", construction: 0, knownTo: new Set() },
    { position: { vertical: 31, horizontal: 20 }, allegiance: "EMPIRE", construction: 0, knownTo: new Set() },
  ];
  const bases: Base[] = [{ position: { vertical: 20, horizontal: 30 }, team: "EMPIRE", strength: 100, knownTo: new Set() }];
  const areas = scanDiscovery(position, "FEDERATION", planets, bases);
  assert.deepEqual(planets.map(p => p.knownTo.has("FEDERATION")), [true, true, false]);
  assert.ok(bases[0].knownTo.has("FEDERATION"));
  const bounds = { verticalMin: 21, verticalMax: 21, horizontalMin: 19, horizontalMax: 21 };
  assert.equal(scanOutput(bounds, true, p => p.horizontal === 20 ? "  " : p.horizontal === 21 ? " *" : " .", areas),
    "\n   20\n21 ! * 21\n   20\n");
});
