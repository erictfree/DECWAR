import type { Device, Ship } from "./model.ts";
import { damagesReport, damagesFromTokens } from "./ship-reports.ts";

type RepairShip = Pick<Ship, "name" | "deviceDamage" | "docked">;

// Observed token-consumption path for C-010 review; before turn completion.
export function repairFromTokens<T extends RepairShip>(prior:T,
  operands:readonly (string|number)[], length:"SHORT"|"MEDIUM"|"LONG") {
  const matches=(value:string|number|undefined, spelling:string)=>
    typeof value==="string" && value.length>0 && spelling.startsWith(value.toUpperCase());
  let request:"DEFAULT"|"ALL"|number="DEFAULT", index=0;
  if (typeof operands[0]==="number" && Number.isInteger(operands[0])) {
    request=operands[0]; index=1;
  } else if (matches(operands[0],"ALL")) { request="ALL"; index=1; }
  const report=matches(operands[index],"DAMAGES");
  const result=repairShip(prior,request,length,report?[]:false);
  if (report) result.output=damagesFromTokens(result.ship.name,result.ship.deviceDamage,length,
    operands.slice(index+1).map(value=>typeof value==="string" && /^[a-z]+$/i.test(value)
      ? {kind:"WORD" as const,text:value} : {kind:"OTHER" as const}));
  return result;
}

// Section 7.13: resolved nonnegative request, before turn completion.
// Guard failures delimit this companion's scope; they are not game diagnostics.
export function repairShip<T extends RepairShip>(prior: T,
  request: "DEFAULT" | "ALL" | number, length: "SHORT" | "MEDIUM" | "LONG",
  report: false | string[] = false) {
  if (typeof request === "number" && (!Number.isInteger(request) || request < 0)) {
    throw new Error("nonnegative integer request required; negative REPAIR is unresolved");
  }
  const maximum = Math.max(...Object.values(prior.deviceDamage));
  if (request === "ALL" && maximum === 0 && report !== false) {
    throw new Error("undamaged REPAIR ALL DAMAGE report acceptance is unresolved (C-010)");
  }
  const requested = request === "ALL" ? maximum
    : request === "DEFAULT" ? (prior.docked ? 100 : 50) : request;
  const amount = Math.min(requested, maximum);
  const ship = structuredClone(prior);
  for (const device of Object.keys(ship.deviceDamage) as Device[]) {
    ship.deviceDamage[device] = Math.max(ship.deviceDamage[device] - amount, 0);
  }
  return { ship, amount, output: report === false ? ""
    : damagesReport(ship.name, ship.deviceDamage, length, report) };
}
