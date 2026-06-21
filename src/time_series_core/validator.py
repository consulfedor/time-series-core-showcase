"""Validation logic for source-trust and recovery hints."""

from __future__ import annotations

from collections import Counter
from datetime import timedelta
from itertools import pairwise

from .models import Candle, Gap, RecoveryAction, ValidationReport


def validate_series(
    candles: list[Candle],
    *,
    expected_interval_seconds: int = 60,
    source: str = "synthetic",
) -> ValidationReport:
    """Validate one time-series slice before it is trusted downstream."""

    if expected_interval_seconds <= 0:
        raise ValueError("expected_interval_seconds must be positive")

    if not candles:
        return ValidationReport(
            source=source,
            expected_interval_seconds=expected_interval_seconds,
            rows_seen=0,
            unique_timestamps=0,
            starts_at=None,
            ends_at=None,
            duplicates=[],
            gaps=[],
            out_of_order_rows=0,
            recovery_actions=[],
        )

    timestamps = [candle.ts for candle in candles]
    counts = Counter(timestamps)
    duplicates = sorted(ts for ts, count in counts.items() if count > 1)
    unique_sorted = sorted(counts)

    interval = timedelta(seconds=expected_interval_seconds)
    gaps: list[Gap] = []
    for left, right in pairwise(unique_sorted):
        delta = right - left
        if delta > interval:
            missing_points = int(delta / interval) - 1
            gaps.append(Gap(after=left, before=right, missing_points=missing_points))

    out_of_order_rows = sum(
        1 for left, right in pairwise(timestamps) if right < left
    )

    recovery_actions: list[RecoveryAction] = []
    for gap in gaps:
        recovery_actions.append(
            RecoveryAction(
                action="backfill_missing_interval",
                start=gap.after + interval,
                end=gap.before - interval,
                reason=f"{gap.missing_points} missing point(s)",
            )
        )

    if duplicates:
        recovery_actions.append(
            RecoveryAction(
                action="deduplicate_and_recalculate_slice",
                start=duplicates[0],
                end=duplicates[-1],
                reason=f"{len(duplicates)} duplicated timestamp(s)",
            )
        )

    if out_of_order_rows:
        recovery_actions.append(
            RecoveryAction(
                action="sort_and_replay_slice",
                start=min(timestamps),
                end=max(timestamps),
                reason=f"{out_of_order_rows} out-of-order row(s)",
            )
        )

    return ValidationReport(
        source=source,
        expected_interval_seconds=expected_interval_seconds,
        rows_seen=len(candles),
        unique_timestamps=len(unique_sorted),
        starts_at=unique_sorted[0],
        ends_at=unique_sorted[-1],
        duplicates=duplicates,
        gaps=gaps,
        out_of_order_rows=out_of_order_rows,
        recovery_actions=recovery_actions,
    )
