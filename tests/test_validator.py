from __future__ import annotations

import unittest

from time_series_core import generate_minute_candles, validate_series


class ValidationTests(unittest.TestCase):
    def test_clean_series_is_trusted(self) -> None:
        report = validate_series(generate_minute_candles(count=30))

        self.assertTrue(report.trusted)
        self.assertEqual(report.rows_seen, 30)
        self.assertEqual(report.unique_timestamps, 30)
        self.assertEqual(report.gaps, [])
        self.assertEqual(report.duplicates, [])

    def test_gap_creates_backfill_action(self) -> None:
        report = validate_series(generate_minute_candles(count=30, gap_at=10))

        self.assertFalse(report.trusted)
        self.assertEqual(len(report.gaps), 1)
        self.assertEqual(report.gaps[0].missing_points, 1)
        self.assertEqual(report.recovery_actions[0].action, "backfill_missing_interval")

    def test_duplicate_creates_recalculation_action(self) -> None:
        report = validate_series(generate_minute_candles(count=30, duplicate_at=10))

        self.assertFalse(report.trusted)
        self.assertEqual(len(report.duplicates), 1)
        self.assertTrue(
            any(
                action.action == "deduplicate_and_recalculate_slice"
                for action in report.recovery_actions
            )
        )


if __name__ == "__main__":
    unittest.main()
