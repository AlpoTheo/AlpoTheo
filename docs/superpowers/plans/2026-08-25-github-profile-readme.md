# GitHub Profile README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a black, game-inspired GitHub profile README with stable focus content, a HAUL case file, and an automatically updated contribution-terrain SVG.

**Architecture:** The README composes three hand-authored repository SVG panels and one generated contribution SVG. A dependency-free Python generator converts GitHub GraphQL contribution-calendar data into deterministic SVG; a scheduled GitHub Actions workflow updates only that asset and preserves the last good render on failure.

**Tech Stack:** GitHub Flavored Markdown, SVG/XML, Python 3 standard library, `unittest`, GitHub GraphQL API, GitHub Actions YAML

**Spec:** `docs/superpowers/specs/2026-08-25-github-profile-readme-design.md`

## Global Constraints

- Use `#080808` as the explicit background, `#F1EFE8` primary text, `#92928C` secondary text, `#2A2A28` rules, and `#FF5A36` as the only expressive accent.
- Do not add gradients, glassmorphism, neon cyberpunk decoration, typing banners, trophy walls, generic GitHub Stats cards, snake animations, skill percentages, or technology-logo walls.
- Do not present inactive or private work as a current public project.
- Do not render private repository names, commit messages, or sensitive activity details.
- Keep LinkedIn as a small footer link and use GitHub Pins as the public-project source of truth.
- Use Python standard-library modules only; do not add runtime package dependencies.
- Every generated asset must remain valid and legible when GitHub renders it in light or dark theme.

---

## File Structure

- `README.md` — short accessible profile copy, owned SVG composition, contacts, and native Pins handoff.
- `assets/profile-header.svg` — identity, player-build header, and three-route map.
- `assets/focus-routes.svg` — three stable focus tracks and their diagrams.
- `assets/haul-case-file.svg` — verified HAUL case study without an invented repository link.
- `assets/contribution-map.svg` — generated terrain checked into the repository as the current/fallback render.
- `scripts/generate_contribution_map.py` — GitHub query, payload parsing, deterministic SVG generation, validation, and atomic write.
- `tests/fixtures/contributions.json` — deterministic representative calendar fixture.
- `tests/fixtures/no_contributions.json` — zero-activity fallback fixture.
- `tests/test_generate_contribution_map.py` — generator unit and CLI behavior tests.
- `tests/test_profile_assets.py` — static SVG structure, palette, content, and accessibility checks.
- `tests/test_readme.py` — README composition, link, banned-pattern, and asset-reference checks.
- `tests/test_workflow.py` — workflow triggers, permissions, generator invocation, and commit-loop protection checks.
- `.github/workflows/update-profile-map.yml` — scheduled/manual/initial-push asset update.

---

### Task 1: Contribution Terrain Generator

**Files:**
- Create: `tests/fixtures/contributions.json`
- Create: `tests/fixtures/no_contributions.json`
- Create: `tests/test_generate_contribution_map.py`
- Create: `scripts/generate_contribution_map.py`
- Create: `assets/contribution-map.svg`

**Interfaces:**
- Consumes: GraphQL JSON with `data.user.contributionsCollection.contributionCalendar.weeks[].contributionDays[]`.
- Produces: `ContributionDay(date: str, count: int, weekday: int)`, `fetch_calendar(username: str, token: str) -> dict`, `parse_calendar(payload: dict) -> list[ContributionDay]`, `render_svg(days: Sequence[ContributionDay]) -> str`, `validate_svg(svg: str) -> None`, and `write_svg_atomic(svg: str, output_path: Path) -> None`.
- CLI: `python scripts/generate_contribution_map.py --username AlpoTheo --output assets/contribution-map.svg [--input-json FILE]`.

- [ ] **Step 1: Create representative and empty GraphQL fixtures**

```json
{
  "data": {
    "user": {
      "contributionsCollection": {
        "contributionCalendar": {
          "weeks": [{
            "contributionDays": [
              {"date": "2026-08-17", "contributionCount": 0, "weekday": 1},
              {"date": "2026-08-18", "contributionCount": 2, "weekday": 2},
              {"date": "2026-08-19", "contributionCount": 7, "weekday": 3}
            ]
          }]
        }
      }
    }
  }
}
```

Create `no_contributions.json` with the same schema and seven days whose `contributionCount` is `0`.

- [ ] **Step 2: Write failing parser, rendering, validation, and atomic-write tests**

```python
import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from scripts.generate_contribution_map import (
    parse_calendar,
    render_svg,
    validate_svg,
    write_svg_atomic,
)

ROOT = Path(__file__).resolve().parents[1]


class ContributionMapTests(unittest.TestCase):
    def load(self, name: str) -> dict:
        return json.loads((ROOT / "tests" / "fixtures" / name).read_text(encoding="utf-8"))

    def test_parse_calendar_preserves_date_count_and_weekday(self):
        days = parse_calendar(self.load("contributions.json"))
        self.assertEqual((days[1].date, days[1].count, days[1].weekday), ("2026-08-18", 2, 2))

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
```

- [ ] **Step 3: Run tests and confirm the missing-module failure**

Run: `python -m unittest tests.test_generate_contribution_map -v`

Expected: FAIL because `scripts.generate_contribution_map` does not exist.

- [ ] **Step 4: Implement the minimal dependency-free generator**

```python
@dataclass(frozen=True)
class ContributionDay:
    date: str
    count: int
    weekday: int


def parse_calendar(payload: dict) -> list[ContributionDay]:
    try:
        weeks = payload["data"]["user"]["contributionsCollection"]["contributionCalendar"]["weeks"]
    except (KeyError, TypeError) as error:
        raise ValueError("response does not contain a contribution calendar") from error
    days = []
    for week in weeks:
        for day in week.get("contributionDays", []):
            days.append(ContributionDay(str(day["date"]), int(day["contributionCount"]), int(day["weekday"])))
    if not days:
        raise ValueError("contribution calendar is empty")
    return days


def fetch_calendar(username: str, token: str) -> dict:
    query = """query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            weeks { contributionDays { date contributionCount weekday } }
          }
        }
      }
    }"""
    body = json.dumps({"query": query, "variables": {"login": username}}).encode("utf-8")
    request = urllib.request.Request(
        "https://api.github.com/graphql",
        data=body,
        headers={"Authorization": f"bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.load(response)
    if payload.get("errors"):
        raise RuntimeError(f"GitHub GraphQL error: {payload['errors'][0]['message']}")
    return payload


def render_svg(days: Sequence[ContributionDay]) -> str:
    ordered = sorted(days, key=lambda day: day.date)
    cells = []
    positive = sum(day.count for day in ordered)
    for index, day in enumerate(ordered):
        week = index // 7
        x = 445 + (week - day.weekday) * 7
        y = 72 + (week + day.weekday) * 3.5
        height = min(24, day.count * 3)
        color = "#FF5A36" if day.count else "#2A2A28"
        opacity = "1" if day.count >= 5 else ".68" if day.count else "1"
        points = f"{x},{y-height} {x+7},{y+3.5-height} {x},{y+7-height} {x-7},{y+3.5-height}"
        cells.append(
            f'<polygon data-terrain-cell="true" points="{points}" fill="{color}" '
            f'fill-opacity="{opacity}"><title>{html.escape(day.date)}: {day.count}</title></polygon>'
        )
    fallback = "" if positive else '<text x="450" y="300" text-anchor="middle">NO PUBLIC ACTIVITY IN RANGE</text>'
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 340" role="img">'
        '<title>AlpoTheo contribution terrain</title><desc>Public GitHub activity rendered as an isometric map.</desc>'
        '<rect width="900" height="340" fill="#080808"/>'
        '<style>text{font:12px monospace;fill:#92928C}.label{fill:#F1EFE8}</style>'
        '<text class="label" x="36" y="42">CONTRIBUTION TERRAIN</text>'
        + "".join(cells) + fallback + '</svg>'
    )


def validate_svg(svg: str) -> None:
    try:
        root = ET.fromstring(svg)
    except ET.ParseError as error:
        raise ValueError("generated output is not valid XML") from error
    if not root.tag.endswith("svg") or root.attrib.get("viewBox") != "0 0 900 340":
        raise ValueError("generated output is not the expected SVG canvas")
    if not any(node.attrib.get("data-terrain-cell") == "true" for node in root.iter()):
        raise ValueError("generated SVG has no terrain cells")


def write_svg_atomic(svg: str, output_path: Path) -> None:
    validate_svg(svg)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, dir=output_path.parent) as stream:
        stream.write(svg)
        temporary = Path(stream.name)
    temporary.replace(output_path)
```

Add an `argparse` CLI that loads `--input-json` when provided; otherwise it requires `GITHUB_TOKEN`, calls `fetch_calendar`, parses the response, renders the SVG, and calls `write_svg_atomic`. Exit with a clear message if the token is missing or the response is invalid.

- [ ] **Step 5: Generate and validate the initial checked-in map from the fixture**

Run: `python scripts/generate_contribution_map.py --username AlpoTheo --input-json tests/fixtures/contributions.json --output assets/contribution-map.svg`

Expected: exit `0`; `assets/contribution-map.svg` parses as XML and contains `CONTRIBUTION TERRAIN`.

- [ ] **Step 6: Run the generator tests**

Run: `python -m unittest tests.test_generate_contribution_map -v`

Expected: all tests PASS.

- [ ] **Step 7: Commit the generator**

```bash
git add scripts/generate_contribution_map.py tests/fixtures tests/test_generate_contribution_map.py assets/contribution-map.svg
git commit -m "feat: generate contribution terrain"
```

---

### Task 2: Static Profile SVG Panels

**Files:**
- Create: `tests/test_profile_assets.py`
- Create: `assets/profile-header.svg`
- Create: `assets/focus-routes.svg`
- Create: `assets/haul-case-file.svg`

**Interfaces:**
- Consumes: profile copy and palette from the approved spec.
- Produces: three standalone SVG 1.1 documents with `viewBox="0 0 900 ..."`, accessible `<title>` and `<desc>`, explicit black backgrounds, and no external assets.

- [ ] **Step 1: Write failing structural and content tests**

```python
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = {
    "profile-header.svg": ("ALP DORUK ŞENGÜN", "AI & DATA", "GAME DEVELOPMENT"),
    "focus-routes.svg": ("AI & DATA ENGINEERING", "GAME DEVELOPMENT", "COMPUTER ENGINEERING"),
    "haul-case-file.svg": ("HAUL", "4-PLAYER CO-OP", "EXTRACTION HORROR", "COMPLETED"),
}


class ProfileAssetTests(unittest.TestCase):
    def test_assets_are_accessible_valid_svg_with_approved_palette(self):
        for filename, required_text in ASSETS.items():
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
            text = (ROOT / "assets" / filename).read_text(encoding="utf-8")
            self.assertNotIn("<script", text.lower())
            self.assertNotIn("http://", text.lower())
            self.assertNotIn("https://", text.lower())
```

- [ ] **Step 2: Run tests and confirm assets are missing**

Run: `python -m unittest tests.test_profile_assets -v`

Expected: FAIL with `FileNotFoundError` for `assets/profile-header.svg`.

- [ ] **Step 3: Author the three SVG panels**

Use the approved Superdesign v4 composition as reference, but implement repository-owned SVG directly. Required sizes:

- `profile-header.svg`: `viewBox="0 0 900 430"`
- `focus-routes.svg`: `viewBox="0 0 900 470"`
- `haul-case-file.svg`: `viewBox="0 0 900 420"`

Use only system-font fallbacks, SVG primitives, and inline styles. Keep minimum display text at 14px and body copy at 16px or larger. Use an optional CSS cursor/route animation that does not hide content when animation is disabled.

- [ ] **Step 4: Run static asset tests**

Run: `python -m unittest tests.test_profile_assets -v`

Expected: all tests PASS.

- [ ] **Step 5: Commit the static visual system**

```bash
git add assets/profile-header.svg assets/focus-routes.svg assets/haul-case-file.svg tests/test_profile_assets.py
git commit -m "feat: add game-inspired profile panels"
```

---

### Task 3: README Composition

**Files:**
- Create: `tests/test_readme.py`
- Modify: `README.md`

**Interfaces:**
- Consumes: four assets in `assets/` and contact URLs from the spec.
- Produces: accessible GitHub Flavored Markdown with stable copy and no duplicated project gallery.

- [ ] **Step 1: Write failing README contract tests**

```python
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ReadmeTests(unittest.TestCase):
    def setUp(self):
        self.text = (ROOT / "README.md").read_text(encoding="utf-8")

    def test_owned_assets_and_contacts_are_present(self):
        for asset in ("profile-header.svg", "focus-routes.svg", "haul-case-file.svg", "contribution-map.svg"):
            self.assertIn(f"./assets/{asset}", self.text)
        self.assertIn("https://github.com/AlpoTheo", self.text)
        self.assertIn("https://www.linkedin.com/in/alpsengun/", self.text)
        self.assertIn("mailto:alpotheo@gmail.com", self.text)

    def test_profile_is_not_a_template_or_linkedin_timeline(self):
        banned = ("github-readme-stats", "readme-typing-svg", "trophy", "snake", "visitor", "radical", "Instagram")
        for item in banned:
            self.assertNotIn(item.lower(), self.text.lower())
        self.assertNotIn("Core Breach", self.text)
        self.assertNotRegex(self.text, re.compile(r"current(?:ly)?\s+(?:building|working)", re.I))

    def test_pins_handoff_is_explicit(self):
        self.assertIn("Selected repositories continue below", self.text)
```

- [ ] **Step 2: Run tests and confirm the old README fails**

Run: `python -m unittest tests.test_readme -v`

Expected: FAIL because the current README references remote generic stats/assets and lacks repository-owned SVGs.

- [ ] **Step 3: Replace README with the approved composition**

```markdown
<div align="center">
  <img src="./assets/profile-header.svg" alt="Alp Doruk Şengün — Computer Engineering, AI and Data Engineering, and Game Development" width="100%" />
</div>

I study systems from both sides: how data becomes intelligence, and how engineering becomes an experience someone can play.

<img src="./assets/focus-routes.svg" alt="Focus routes: AI and Data Engineering, Game Development, and Computer Engineering" width="100%" />

<img src="./assets/haul-case-file.svg" alt="HAUL — completed four-player co-op extraction horror game project" width="100%" />

<img src="./assets/contribution-map.svg" alt="AlpoTheo public GitHub contribution terrain, updated automatically" width="100%" />

### Continue

[GitHub](https://github.com/AlpoTheo) · [LinkedIn](https://www.linkedin.com/in/alpsengun/) · [Email](mailto:alpotheo@gmail.com)

<sub>Selected repositories continue below this README ↓</sub>
```

- [ ] **Step 4: Run README tests**

Run: `python -m unittest tests.test_readme -v`

Expected: all tests PASS.

- [ ] **Step 5: Commit README integration**

```bash
git add README.md tests/test_readme.py
git commit -m "feat: redesign profile README"
```

---

### Task 4: Automated Profile Map Workflow

**Files:**
- Create: `tests/test_workflow.py`
- Create: `.github/workflows/update-profile-map.yml`

**Interfaces:**
- Consumes: `scripts/generate_contribution_map.py`, the standard `GITHUB_TOKEN`, and the `AlpoTheo` username.
- Produces: an updated `assets/contribution-map.svg` commit only when generated content differs.

- [ ] **Step 1: Write failing workflow contract tests**

```python
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.text = (ROOT / ".github" / "workflows" / "update-profile-map.yml").read_text(encoding="utf-8")

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
```

- [ ] **Step 2: Run tests and confirm workflow is missing**

Run: `python -m unittest tests.test_workflow -v`

Expected: FAIL with `FileNotFoundError`.

- [ ] **Step 3: Add the minimal update workflow**

```yaml
name: Update contribution terrain

on:
  workflow_dispatch:
  schedule:
    - cron: "17 3 * * 1"
  push:
    branches: [main]
    paths:
      - scripts/generate_contribution_map.py
      - .github/workflows/update-profile-map.yml

permissions:
  contents: write

concurrency:
  group: profile-map
  cancel-in-progress: true

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Generate contribution terrain
        env:
          GITHUB_TOKEN: ${{ github.token }}
        run: python scripts/generate_contribution_map.py --username AlpoTheo --output assets/contribution-map.svg
      - name: Commit changed terrain
        run: |
          if git diff --quiet -- assets/contribution-map.svg; then exit 0; fi
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add assets/contribution-map.svg
          git commit -m "chore: update contribution terrain"
          git push
```

- [ ] **Step 4: Run workflow tests**

Run: `python -m unittest tests.test_workflow -v`

Expected: all tests PASS.

- [ ] **Step 5: Commit workflow automation**

```bash
git add .github/workflows/update-profile-map.yml tests/test_workflow.py
git commit -m "ci: update profile contribution terrain"
```

---

### Task 5: Full Verification and Visual QA

**Files:**
- Verify: `README.md`
- Verify: `assets/*.svg`
- Verify: `scripts/generate_contribution_map.py`
- Verify: `.github/workflows/update-profile-map.yml`
- Temporary QA only: `work/qa/*.png` (do not commit)

**Interfaces:**
- Consumes: all implementation outputs from Tasks 1–4.
- Produces: test evidence, rendered PNG inspection, and a clean commit state ready to push.

- [ ] **Step 1: Run the complete test suite**

Run: `python -m unittest discover -s tests -v`

Expected: all tests PASS.

- [ ] **Step 2: Compile Python source**

Run: `python -m compileall -q scripts tests`

Expected: exit `0` with no syntax errors.

- [ ] **Step 3: Regenerate both representative and zero-activity maps**

Run:

```bash
python scripts/generate_contribution_map.py --username AlpoTheo --input-json tests/fixtures/contributions.json --output assets/contribution-map.svg
python scripts/generate_contribution_map.py --username AlpoTheo --input-json tests/fixtures/no_contributions.json --output work/no-contributions.svg
```

Expected: both commands exit `0`; both SVGs parse as XML.

- [ ] **Step 4: Render every SVG using headless Microsoft Edge**

Create a temporary HTML contact sheet in `work/qa/` that displays all four SVG assets at 900px and 420px container widths. Run:

```powershell
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless --disable-gpu --hide-scrollbars --window-size=1200,2600 --screenshot='work/qa/profile-desktop.png' (Resolve-Path 'work/qa/profile-desktop.html')
```

Repeat with `--window-size=480,2600` for `profile-mobile.png`. Inspect both PNGs for clipping, illegible text, broken paths, inconsistent gaps, and incorrect theme colors.

- [ ] **Step 5: Run repository hygiene checks**

Run:

```bash
git diff --check
git status --short
git diff --stat origin/main...HEAD
```

Expected: no whitespace errors; only the design doc, plan, README, owned assets, generator, tests, and workflow are changed.

- [ ] **Step 6: Commit any QA corrections and rerun verification**

If QA requires corrections, edit only the affected SVG/README/generator file, rerun the relevant unit test plus Steps 1–5, then commit:

```bash
git add README.md assets scripts tests .github/workflows
git commit -m "fix: polish profile rendering"
```

Expected: complete suite passes after the correction commit.

---

### Task 6: Publish and Confirm GitHub Rendering

**Files:**
- External state: `origin/main`
- Public result: `https://github.com/AlpoTheo`

**Interfaces:**
- Consumes: verified local `main` commits.
- Produces: public profile README and an initial workflow run that refreshes the contribution terrain.

- [ ] **Step 1: Confirm the push target and outgoing commits**

Run:

```bash
git remote -v
git log --oneline origin/main..HEAD
```

Expected: origin is `https://github.com/AlpoTheo/AlpoTheo.git`; outgoing commits contain only the approved profile redesign work.

- [ ] **Step 2: Push the verified main branch**

Run: `git push origin main`

Expected: push succeeds and reports the new `main` tip.

- [ ] **Step 3: Confirm public files and workflow state**

Open:

- `https://github.com/AlpoTheo`
- `https://github.com/AlpoTheo/AlpoTheo/actions/workflows/update-profile-map.yml`
- `https://raw.githubusercontent.com/AlpoTheo/AlpoTheo/main/assets/contribution-map.svg`

Expected: README renders all four panels; workflow is queued/running/completed; raw map returns SVG content.

- [ ] **Step 4: Wait for the workflow's generated-asset commit when triggered**

After the initial workflow completes, fetch and inspect:

```bash
git fetch origin main
git log -3 --oneline origin/main
```

Expected: either no change because the generated map matches, or a `chore: update contribution terrain` bot commit appears. No workflow loop occurs because asset-only commits are excluded by the push path filter.

- [ ] **Step 5: Report the public profile URL and verification evidence**

Report the profile URL, pushed commit tip, test count, workflow result, and any limitation such as private contribution counts remaining anonymized.
