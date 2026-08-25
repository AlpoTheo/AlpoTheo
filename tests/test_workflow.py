import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        workflow = ROOT / ".github" / "workflows" / "update-profile-map.yml"
        self.text = workflow.read_text(encoding="utf-8")

    def test_triggers_and_permissions_are_minimal(self):
        self.assertIn("workflow_dispatch:", self.text)
        self.assertIn("schedule:", self.text)
        self.assertIn("push:", self.text)
        self.assertIn("contents: write", self.text)
        self.assertNotIn("pull-requests: write", self.text)

    def test_generator_and_loop_guard_are_present(self):
        self.assertIn("scripts/generate_contribution_map.py", self.text)
        self.assertIn("assets/contribution-map.svg", self.text)
        self.assertIn("github.token", self.text)
        self.assertIn("git diff --quiet", self.text)
        self.assertIn("paths:", self.text)
        self.assertNotIn("assets/**", self.text)


if __name__ == "__main__":
    unittest.main()
