#!/usr/bin/env python3
"""Summarize one-variable improvement comparison artifacts."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    args = parser.parse_args()
    groups = defaultdict(list)
    for path in sorted(args.root.glob("*.result.json")):
        try:
            result = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError):
            continue
        groups[result.get("case", "unknown")].append(result)

    report = []
    for case, results in sorted(groups.items()):
        usable = [r for r in results if r.get("quality") == "usable"]
        wins = {"FEDERATION": 0, "EMPIRE": 0}
        improved_wins = 0
        side_counts = defaultdict(int)
        for result in usable:
            winner = ((result.get("metrics") or {}).get("warResult") or {}).get("winner")
            if winner in wins:
                wins[winner] += 1
                if result.get("improvedSide", "none").upper() == winner:
                    improved_wins += 1
            side_counts[result.get("improvedSide", "none")] += 1
        report.append({
            "case": case,
            "runs": len(results),
            "usable": len(usable),
            "contended": sum(r.get("quality") == "contended" for r in results),
            "federationWins": wins["FEDERATION"],
            "empireWins": wins["EMPIRE"],
            "improvedSideWins": improved_wins,
            "usableByImprovedSide": dict(sorted(side_counts.items())),
            "missingTerminalResult": sum(not (r.get("metrics") or {}).get("warResult") for r in usable),
        })
    baselines = [r for r in groups.get("baseline", []) if r.get("quality") == "usable"]
    baseline_summary = {
        "runs": len(groups.get("baseline", [])),
        "usable": len(baselines),
        "federationWins": sum(((r.get("metrics") or {}).get("warResult") or {}).get("winner") == "FEDERATION" for r in baselines),
        "empireWins": sum(((r.get("metrics") or {}).get("warResult") or {}).get("winner") == "EMPIRE" for r in baselines),
        "missingTerminalResult": sum(not (r.get("metrics") or {}).get("warResult") for r in baselines),
    }
    print(json.dumps({"root": str(args.root), "baseline": baseline_summary, "cases": report}, indent=2))


if __name__ == "__main__":
    main()
