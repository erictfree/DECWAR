import type { Position } from "./model.ts";

// Section 10.2 fixed-width fields. Finer-than-tenth conversion remains open.
function fitInteger(sign: string, digits: string, width: number): string {
  const text = sign + digits;
  return width > 0 && text.length > width
    ? sign + "*".repeat(width - sign.length) : text.padStart(width, " ");
}

export function integerField(value: number, width = 0, signed = false): string {
  if (!Number.isInteger(value) || width < 0 || !Number.isInteger(width)) {
    throw new RangeError("integer value and nonnegative integer width required");
  }
  const sign = value < 0 ? "-" : signed && value > 0 ? "+" : "";
  return fitInteger(sign, String(Math.abs(value)), width);
}

export function decimalField(value: number, width: number,
  short: boolean, signed = false): string {
  const tenths = Math.round(value * 10);
  if (!Number.isFinite(value) || Math.abs(value * 10 - tenths) > 1e-8) {
    throw new RangeError("finer-than-tenth conversion unresolved");
  }
  const whole = Math.trunc(value);
  const sign = signed ? (value > 0 ? "+" : "-") : (whole < 0 ? "-" : "");
  if (!Number.isInteger(width) || width < 0) {
    throw new RangeError("unsupported field width");
  }
  return fitInteger(sign, String(Math.abs(whole)), width)
    + (short ? "" : "." + Math.abs(tenths % 10));
}

export function positionField(position: Position, observer: Position,
  mode: "ABSOLUTE" | "RELATIVE" | "BOTH", short: boolean, width = 0): string {
  const dv = position.vertical - observer.vertical;
  const dh = position.horizontal - observer.horizontal;
  const absolute = (short ? "" : "@") + integerField(position.vertical, width)
    + "-" + integerField(position.horizontal, width);
  const relative = width === 0 && dv === 0 && dh === 0 ? ""
    : integerField(dv, width === 0 ? 0 : width + 1, true) + ","
      + integerField(dh, width === 0 ? 0 : width + 1, true);
  if (mode === "ABSOLUTE") return absolute;
  if (mode === "RELATIVE") return relative;
  return absolute + (relative ? " " + relative : "");
}
