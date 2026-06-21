"""Synthetic time-series generator used for public examples and tests."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from random import Random

from .models import Candle


def generate_minute_candles(
    *,
    count: int = 120,
    start: datetime | None = None,
    seed: int = 7,
    gap_at: int | None = None,
    duplicate_at: int | None = None,
) -> list[Candle]:
    """Generate deterministic minute candles with optional public test defects."""

    if count <= 0:
        raise ValueError("count must be positive")

    rng = Random(seed)
    ts = start or datetime(2026, 1, 1, tzinfo=timezone.utc)
    price = 100.0
    candles: list[Candle] = []

    for index in range(count):
        if gap_at is not None and index == gap_at:
            ts += timedelta(minutes=1)

        delta = rng.uniform(-0.45, 0.45)
        open_price = price
        close = max(1.0, open_price + delta)
        high = max(open_price, close) + rng.uniform(0.01, 0.25)
        low = min(open_price, close) - rng.uniform(0.01, 0.25)
        volume = rng.uniform(10.0, 120.0)

        candles.append(
            Candle(
                ts=ts,
                open=round(open_price, 4),
                high=round(high, 4),
                low=round(low, 4),
                close=round(close, 4),
                volume=round(volume, 4),
            )
        )
        price = close
        ts += timedelta(minutes=1)

    if duplicate_at is not None:
        if duplicate_at < 0 or duplicate_at >= len(candles):
            raise ValueError("duplicate_at is outside generated range")
        candles.insert(duplicate_at + 1, candles[duplicate_at])

    return candles
