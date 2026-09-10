#!/usr/bin/env python3
"""Run one-variable, side-swapped gameplay comparisons.

The baseline is the current bot with every experimental policy disabled.  Each
case enables exactly one policy for Federation or Empire, then repeats the
pair over the requested tournament seeds.  Outputs are kept in independent
directories so a completed run can be audited without reconstructing flags.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


CASES = {
    "resupply": ("--federation-resupply", "persistent", "--empire-resupply", "persistent"),
    "bases": ("--federation-bases", "coordinated", "--empire-bases", "coordinated"),
    "survey": ("--federation-survey", "handoff", "--empire-survey", "handoff"),
    "exploration": ("--federation-exploration", "systematic", "--empire-exploration", "systematic"),
    "long-moves": ("--federation-long-moves", None, "--empire-long-moves", None),
    "close-fire": ("--federation-close-fire", None, "--empire-close-fire", None),
}


def collect_result(log_dir: Path, case: str, seed: int, improved_side: str,
                   started: str, cmd: list[str], completed: subprocess.CompletedProcess[str]) -> dict:
    result = {
        "case": case, "seed": seed, "improvedSide": improved_side,
        "startedAt": started, "returnCode": completed.returncode,
        "command": cmd, "stdout": completed.stdout[-4000:], "stderr": completed.stderr[-4000:],
    }
    launcher_result = log_dir / "launcher-result.json"
    if launcher_result.exists():
        try:
            result["launcherResult"] = json.loads(launcher_result.read_text())
        except json.JSONDecodeError:
            result["launcherResultParseError"] = True
    summary_path = log_dir / "fleet" / "summary.json"
    if summary_path.exists():
        try:
            summary = json.loads(summary_path.read_text())
            bots = summary.get("bots", {})
            result["metrics"] = {
                "warResult": summary.get("warResult"),
                "elapsedMs": summary.get("elapsedMs"),
                "plannedSeconds": summary.get("plannedSeconds"),
                "durationReached": summary.get("durationReached"),
                "schedulingPauses": summary.get("schedulingPauses", 0),
                "missedMs": summary.get("missedMs", 0),
                "decisions": sum(int(bot.get("decisions", 0)) for bot in bots.values()),
                "deaths": sum(int(bot.get("deaths", 0)) for bot in bots.values()),
                "stalls": sum(int(bot.get("stalls", 0)) for bot in bots.values()),
                "states": sorted({bot.get("state") for bot in bots.values()}),
            }
            elapsed = result["metrics"].get("elapsedMs") or 0
            missed = result["metrics"].get("missedMs") or 0
            states = set(result["metrics"]["states"])
            normal_deadline = result["metrics"].get("durationReached") is True
            result["quality"] = (
                "contended" if (elapsed and missed / elapsed > 0.05) or
                states.intersection({"failed", "blocked"}) or
                ("interrupted" in states and not normal_deadline)
                else "usable"
            )
        except (OSError, json.JSONDecodeError, TypeError, ValueError):
            result["summaryParseError"] = True
    (log_dir.parent / f"{log_dir.name}.result.json").write_text(json.dumps(result, indent=2) + "\n")
    return result


def run_case(root: Path, case: str, seed: int, improved_side: str, args: argparse.Namespace) -> dict:
    fed_improved = improved_side == "federation"
    name = f"{case}-seed{seed}-{improved_side}"
    log_dir = root / name
    cmd = [
        "node", "experimental/automated-player/fresh-fleet.ts",
        "--ships", str(args.ships), "--seconds", str(args.seconds),
        "--rounds", str(args.rounds), "--lives", str(args.lives),
        "--federation-strategy", "siege", "--empire-strategy", "siege",
        "--tournament-seed", str(seed), "--torpedo-corridor",
        "--log-dir", str(log_dir),
    ]
    # Keep every policy at its documented baseline unless this case enables it.
    if case == "resupply":
        cmd += ["--federation-resupply", "persistent" if fed_improved else "baseline",
                "--empire-resupply", "baseline" if fed_improved else "persistent"]
    elif case == "bases":
        cmd += ["--federation-bases", "coordinated" if fed_improved else "baseline",
                "--empire-bases", "baseline" if fed_improved else "coordinated"]
    elif case == "survey":
        cmd += ["--federation-survey", "handoff" if fed_improved else "baseline",
                "--empire-survey", "baseline" if fed_improved else "handoff"]
    elif case == "exploration":
        cmd += ["--federation-exploration", "systematic" if fed_improved else "baseline",
                "--empire-exploration", "baseline" if fed_improved else "systematic"]
    elif case == "long-moves":
        if fed_improved:
            cmd += ["--federation-long-moves"]
        else:
            cmd += ["--empire-long-moves"]
    elif case == "close-fire":
        if fed_improved:
            cmd += ["--federation-close-fire"]
        else:
            cmd += ["--empire-close-fire"]

    started = datetime.now(timezone.utc).isoformat()
    log_dir.parent.mkdir(parents=True, exist_ok=True)
    completed = subprocess.run(cmd, cwd=args.repo, text=True, capture_output=True)
    return collect_result(log_dir, case, seed, improved_side, started, cmd, completed)


def run_baseline(root: Path, seed: int, args: argparse.Namespace) -> dict:
    """Run both factions with all experimental policies at their baseline."""
    name = f"baseline-seed{seed}"
    log_dir = root / name
    cmd = [
        "node", "experimental/automated-player/fresh-fleet.ts",
        "--ships", str(args.ships), "--seconds", str(args.seconds),
        "--rounds", str(args.rounds), "--lives", str(args.lives),
        "--federation-strategy", "siege", "--empire-strategy", "siege",
        "--tournament-seed", str(seed), "--torpedo-corridor",
        "--federation-resupply", "baseline", "--empire-resupply", "baseline",
        "--federation-bases", "baseline", "--empire-bases", "baseline",
        "--federation-survey", "baseline", "--empire-survey", "baseline",
        "--federation-exploration", "baseline", "--empire-exploration", "baseline",
        "--log-dir", str(log_dir),
    ]
    started = datetime.now(timezone.utc).isoformat()
    log_dir.parent.mkdir(parents=True, exist_ok=True)
    completed = subprocess.run(cmd, cwd=args.repo, text=True, capture_output=True)
    return collect_result(log_dir, "baseline", seed, "none", started, cmd, completed)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", choices=["all", *CASES], default="all")
    parser.add_argument("--seeds", nargs="+", type=int, default=[42, 1729, 8675309])
    parser.add_argument("--seconds", type=int, default=600)
    parser.add_argument("--rounds", type=int, default=100000)
    parser.add_argument("--lives", type=int, default=100)
    parser.add_argument("--ships", type=int, default=10)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    args = parser.parse_args()
    cases = list(CASES) if args.case == "all" else [args.case]
    manifest = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "baseline": "all experimental policies disabled",
        "cases": cases, "seeds": args.seeds, "seconds": args.seconds,
        "rounds": args.rounds, "lives": args.lives, "ships": args.ships,
        "sideSwapped": True,
        "baselineRuns": True,
    }
    args.root.mkdir(parents=True, exist_ok=True)
    (args.root / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    results = []
    for seed in args.seeds:
        results.append(run_baseline(args.root, seed, args))
        (args.root / "progress.json").write_text(json.dumps({
            "completed": len(results), "total": len(args.seeds) + len(cases) * len(args.seeds) * 2,
            "last": results[-1],
        }, indent=2) + "\n")
    for case in cases:
        for seed in args.seeds:
            for side in ("federation", "empire"):
                results.append(run_case(args.root, case, seed, side, args))
                (args.root / "progress.json").write_text(json.dumps({
                    "completed": len(results), "total": len(args.seeds) + len(cases) * len(args.seeds) * 2,
                    "last": results[-1],
                }, indent=2) + "\n")
    (args.root / "result.json").write_text(json.dumps({"manifest": manifest, "results": results}, indent=2) + "\n")


if __name__ == "__main__":
    main()
