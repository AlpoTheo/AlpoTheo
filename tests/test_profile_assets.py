import unittest
import xml.etree.ElementTree as ET
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = {
    "profile-header.svg": (
        "ALP DORUK",
        "&#350;ENG&#220;N",
        "AI & DATA",
        "GAME DEVELOPMENT",
    ),
    "focus-routes.svg": (
        "AI & DATA ENGINEERING",
        "GAME DEVELOPMENT",
        "COMPUTER ENGINEERING",
    ),
    "haul-case-file.svg": (
        "HAUL",
        "4-PLAYER CO-OP",
        "EXTRACTION HORROR",
        "COMPLETED",
    ),
}


class ProfileAssetTests(unittest.TestCase):
    def test_assets_are_accessible_valid_svg_with_approved_palette(self):
        for filename, required_text in ASSETS.items():
            with self.subTest(filename=filename):
                text = (ROOT / "assets" / filename).read_text(encoding="utf-8")
                root = ET.fromstring(text)
                self.assertTrue(root.tag.endswith("svg"))
                self.assertIsNotNone(root.find("{http://www.w3.org/2000/svg}title"))
                self.assertIsNotNone(root.find("{http://www.w3.org/2000/svg}desc"))
                self.assertIn("#080808", text)
                self.assertIn("#FF5A36", text)
                self.assertNotIn("linearGradient", text)
                for item in required_text:
                    self.assertIn(item, text)

    def test_assets_have_no_external_or_script_content(self):
        for filename in ASSETS:
            with self.subTest(filename=filename):
                text = (ROOT / "assets" / filename).read_text(encoding="utf-8")
                self.assertNotIn("<script", text.lower())
                self.assertIsNone(re.search(r"(?:href|src)=[\"']https?://", text, re.I))


if __name__ == "__main__":
    unittest.main()
