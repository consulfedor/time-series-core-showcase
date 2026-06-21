#!/usr/bin/env python3
"""Run the public time-series validation proof slice."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from time_series_core import generate_minute_candles, validate_series  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate synthetic minute candles and validate source trust."
    )
    parser.add_argument("--count", type=int, default=120)
    parser.add_argument("--gap-at", type=int, default=None)
    parser.add_argument("--duplicate-at", type=int, default=None)
    parser.add_argument("--strict", action="store_true", help="exit non-zero if untrusted")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    candles = generate_minute_candles(
        count=args.count,
        gap_at=args.gap_at,
        duplicate_at=args.duplicate_at,
    )
    report = validate_series(candles)
    print(json.dumps(report.to_dict(), indent=2, ensure_ascii=False))
    return 2 if args.strict and not report.trusted else 0


if __name__ == "__main__":
    raise SystemExit(main())
