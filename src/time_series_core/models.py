"""Domain models for a minimal public time-series validation slice."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True, slots=True)
class Candle:
    """One OHLCV candle in UTC."""

    ts: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    source: str = "synthetic"

    def __post_init__(self) -> None:
        if self.ts.tzinfo is None:
            raise ValueError("Candle timestamp must be timezone-aware")
        if self.high < max(self.open, self.close) or self.low > min(self.open, self.close):
            raise ValueError("OHLC values are inconsistent")
        if self.volume < 0:
            raise ValueError("Volume cannot be negative")


@dataclass(frozen=True, slots=True)
class Gap:
    """Missing interval between two adjacent known timestamps."""

    after: datetime
    before: datetime
    missing_points: int


@dataclass(frozen=True, slots=True)
class RecoveryAction:
    """Backfill/recalculation action suggested by validation."""

    action: str
    start: datetime
    end: datetime
    reason: str


@dataclass(frozen=True, slots=True)
class ValidationReport:
    """Source-trust verdict for one time-series slice."""

    source: str
    expected_interval_seconds: int
    rows_seen: int
    unique_timestamps: int
    starts_at: datetime | None
    ends_at: datetime | None
    duplicates: list[datetime]
    gaps: list[Gap]
    out_of_order_rows: int
    recovery_actions: list[RecoveryAction]

    @property
    def trusted(self) -> bool:
        return not self.duplicates and not self.gaps and self.out_of_order_rows == 0

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["trusted"] = self.trusted
        return _json_ready(payload)


def _json_ready(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    if isinstance(value, list):
        return [_json_ready(item) for item in value]
    if isinstance(value, dict):
        return {key: _json_ready(item) for key, item in value.items()}
    return value
