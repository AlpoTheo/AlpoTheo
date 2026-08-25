import json
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class StructureParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.attrs = []

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        self.attrs.extend(attrs)


class SiteTests(unittest.TestCase):
    def setUp(self):
        self.html = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
        self.css = (ROOT / "site" / "styles.css").read_text(encoding="utf-8")
        self.js = (ROOT / "site" / "app.js").read_text(encoding="utf-8")
        self.parser = StructureParser()
        self.parser.feed(self.html)

    def test_semantic_interaction_surface_exists(self):
        self.assertEqual(self.parser.tags.count("h1"), 1)
        self.assertIn("canvas", self.parser.tags)
        attributes = set(self.parser.attrs)
        self.assertIn(("aria-live", "polite"), attributes)
        for route in ("data", "game", "core"):
            self.assertIn(("data-route", route), attributes)
        for node in ("teamwork", "tension", "risk", "extraction"):
            self.assertIn(("data-haul-node", node), attributes)

    def test_visual_system_is_authored_and_responsive(self):
        for color in ("#080808", "#F1EFE8", "#92928C", "#2A2A28", "#FF5A36"):
            self.assertIn(color, self.css)
        self.assertIn("@media (max-width: 720px)", self.css)
        self.assertIn("prefers-reduced-motion: reduce", self.css)
        for banned in (
            "linear-gradient",
            "backdrop-filter",
            "box-shadow: 0 0",
            "#7c3aed",
            "#06b6d4",
        ):
            self.assertNotIn(banned, self.css.lower())

    def test_app_loads_local_data_and_persists_only_exploration(self):
        self.assertIn("./data/profile.json", self.js)
        self.assertIn("./data/contributions.json", self.js)
        self.assertIn("localStorage", self.js)
        self.assertNotIn('fetch("http', self.js)
        self.assertNotIn("fetch('http", self.js)

    def test_profile_data_is_valid_and_contains_verified_haul_nodes(self):
        profile = json.loads(
            (ROOT / "site" / "data" / "profile.json").read_text(encoding="utf-8")
        )
        self.assertEqual(profile["haul"]["status"], "COMPLETED")
        self.assertEqual(
            set(profile["haul"]["nodes"]),
            {"teamwork", "tension", "risk", "extraction"},
        )


if __name__ == "__main__":
    unittest.main()
