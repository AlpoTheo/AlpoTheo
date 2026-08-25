import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ReadmeTests(unittest.TestCase):
    def setUp(self):
        self.text = (ROOT / "README.md").read_text(encoding="utf-8")

    def test_owned_assets_and_contacts_are_present(self):
        for asset in ("profile-header.svg", "contribution-map.svg"):
            self.assertIn(f"./assets/{asset}", self.text)
        self.assertIn("https://github.com/AlpoTheo", self.text)
        self.assertIn("https://www.linkedin.com/in/alpsengun/", self.text)
        self.assertIn("mailto:alpotheo@gmail.com", self.text)

    def test_profile_is_not_a_template_or_linkedin_timeline(self):
        banned = (
            "github-readme-stats",
            "readme-typing-svg",
            "trophy",
            "snake",
            "visitor",
            "radical",
            "Instagram",
        )
        for item in banned:
            self.assertNotIn(item.lower(), self.text.lower())
        self.assertNotIn("Core Breach", self.text)
        self.assertNotRegex(
            self.text,
            re.compile(r"current(?:ly)?\s+(?:building|working)", re.I),
        )

    def test_pins_handoff_is_explicit(self):
        self.assertIn("Selected repositories continue below", self.text)

    def test_readme_is_a_native_launch_console(self):
        self.assertIn("ENTER THE SYSTEM", self.text)
        self.assertIn("https://alpotheo.github.io/AlpoTheo/", self.text)
        self.assertGreaterEqual(self.text.count("<details>"), 4)
        for label in (
            "AI &amp; Data Engineering",
            "Game Development",
            "Computer Engineering",
            "HAUL",
        ):
            self.assertIn(label, self.text)

    def test_passive_panels_are_not_presented_as_controls(self):
        self.assertNotIn("./assets/focus-routes.svg", self.text)
        self.assertNotIn("./assets/haul-case-file.svg", self.text)


if __name__ == "__main__":
    unittest.main()
