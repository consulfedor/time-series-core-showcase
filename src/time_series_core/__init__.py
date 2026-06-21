"""Small public proof slice for time-series validation."""

from .models import Candle, Gap, RecoveryAction, ValidationReport
from .synthetic import generate_minute_candles
from .validator import validate_series

__all__ = [
    "Candle",
    "Gap",
    "RecoveryAction",
    "ValidationReport",
    "generate_minute_candles",
    "validate_series",
]
