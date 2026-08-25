import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from scripts.generate_contribution_map import (
    parse_calendar,
    render_json,
    render_svg,
    validate_json,
    validate_svg,
    write_json_atomic,
    write_svg_atomic,
)

ROOT = Path(__file__).resolve().parents[1]


class ContributionMapTests(unittest.TestCase):
    def load(self, name: str) -> dict:
        fixture = ROOT / "tests" / "fixtures" / name
        return json.loads(fixture.read_text(encoding="utf-8"))

    def test_parse_calendar_preserves_date_count_and_weekday(self):
        days = parse_calendar(self.load("contributions.json"))

        self.assertEqual(
            (days[1].date, days[1].count, days[1].weekday),
            ("2026-08-18", 2, 2),
        )

    def test_render_is_deterministic_and_uses_profile_palette(self):
        days = parse_calendar(self.load("contributions.json"))

        first = render_svg(days)
        second = render_svg(days)

        self.assertEqual(first, second)
        for color in ("#080808", "#F1EFE8", "#92928C", "#2A2A28", "#FF5A36"):
            self.assertIn(color, first)
        ET.fromstring(first)

    def test_zero_activity_still_renders_valid_map(self):
        svg = render_svg(parse_calendar(self.load("no_contributions.json")))

        validate_svg(svg)

        self.assertIn("NO PUBLIC ACTIVITY IN RANGE", svg)

    def test_malformed_payload_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "contribution calendar"):
            parse_calendar({"data": {}})

    def test_atomic_write_preserves_existing_file_when_validation_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "map.svg"
            output.write_text("last-good", encoding="utf-8")

            with self.assertRaises(ValueError):
                write_svg_atomic("<not-svg />", output)

            self.assertEqual(output.read_text(encoding="utf-8"), "last-good")

    def test_json_output_is_deterministic_and_has_public_summary(self):
        days = parse_calendar(self.load("contributions.json"))

        first = render_json(days)

        self.assertEqual(first, render_json(days))
        payload = json.loads(first)
        self.assertEqual(
            payload["summary"], {"total": 9, "activeDays": 2, "peak": 7}
        )
        self.assertEqual(
            payload["days"][1],
            {"date": "2026-08-18", "count": 2, "weekday": 2},
        )
        validate_json(first)

    def test_invalid_json_does_not_replace_last_good_file(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "contributions.json"
            output.write_text('{"last":"good"}', encoding="utf-8")

            with self.assertRaises(ValueError):
                write_json_atomic('{"days":[]}', output)

            self.assertEqual(
                output.read_text(encoding="utf-8"), '{"last":"good"}'
            )


if __name__ == "__main__":
    unittest.main()
