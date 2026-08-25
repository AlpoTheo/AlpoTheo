# Interactive Profile System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the passive image-led profile with a GitHub-native launch README and a real game-like HTML/CSS/JavaScript profile deployed through GitHub Pages.

**Architecture:** The README exposes only interactions GitHub preserves and launches a dependency-free Pages application. Pure JavaScript modules own command/state and terrain math; a DOM adapter and Canvas renderer expose those mechanics. The existing Python contribution generator produces both the fallback README SVG and deterministic JSON consumed by the Pages application.

**Tech Stack:** GitHub Flavored Markdown, HTML5, CSS, JavaScript ES modules, Canvas 2D, Python 3 standard library, Node 24 built-in test runner, Python `unittest`, GitHub Actions, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-08-25-interactive-profile-system-design.md`

## Global Constraints

- Use `#080808`, `#F1EFE8`, `#92928C`, `#2A2A28`, and `#FF5A36`; add no other expressive accent.
- Add no gradients, glassmorphism, neon purple/cyan, glow-heavy cyberpunk, particles, bento grids, typing-name banners, trophy walls, visitor counters, logo clouds, skill percentages, or fabricated status values.
- Every animation must communicate loading, focus, navigation, or spatial response.
- Use no frontend framework, runtime package dependency, external font, tracker, analytics script, or third-party profile renderer.
- Keep JavaScript mechanics on GitHub Pages; README interactions must remain valid after GitHub sanitization.
- State only verified HAUL facts: completed CENG 454 project, four-player co-op, extraction horror.
- Expose no private repository names, commit messages, or sensitive activity details.
- Support keyboard, pointer, touch, 360 px layouts, and `prefers-reduced-motion`.

---

## File Structure

- `README.md` — GitHub-native launch console, expandable route records, HAUL record, terrain signal, contacts, and Pins handoff.
- `site/index.html` — semantic application shell, fallback copy, controls, live region, and Canvas.
- `site/styles.css` — black industrial visual system, responsive layouts, interaction states, focus, and reduced motion.
- `site/core.js` — route catalog, immutable state transitions, terminal parser, command history model, and exploration progress.
- `site/terrain.js` — deterministic isometric cell geometry, camera transforms, hit testing, and Canvas renderer.
- `site/app.js` — DOM bindings, storage adapter, input routing, render coordination, and boot sequence.
- `site/data/profile.json` — authored stable route, HAUL, command, contact, and loadout content.
- `site/data/contributions.json` — generated public dates/counts/weekdays and summary.
- `package.json` — ES-module declaration and dependency-free Node test command.
- `tests-js/core.test.js` — state and terminal behavior tests.
- `tests-js/terrain.test.js` — terrain geometry/camera/hit-test tests.
- `tests/test_site.py` — semantic HTML, palette, banned-pattern, responsive, and asset contract tests.
- `scripts/generate_contribution_map.py` — add deterministic JSON render/validation/atomic write and CLI output.
- `tests/test_generate_contribution_map.py` — extend generator coverage for JSON output.
- `.github/workflows/update-profile-map.yml` — generate both assets, upload the Pages artifact, commit changed data without loops, and deploy.
- `tests/test_workflow.py` — extend workflow deployment and generated-data contract.

---

### Task 1: Dual-Format Contribution Data

**Files:**
- Modify: `scripts/generate_contribution_map.py`
- Modify: `tests/test_generate_contribution_map.py`
- Create: `site/data/contributions.json`

**Interfaces:**
- Produces: `render_json(days: Sequence[ContributionDay]) -> str`, `validate_json(text: str) -> None`, and `write_json_atomic(text: str, output_path: Path) -> None`.
- CLI adds optional `--json-output PATH`; a single parsed calendar drives both outputs.
- JSON shape: `{"range":{"start":str,"end":str},"summary":{"total":int,"activeDays":int,"peak":int},"days":[{"date":str,"count":int,"weekday":int}]}`.

- [ ] **Step 1: Add failing deterministic JSON and atomic-preservation tests**

```python
from scripts.generate_contribution_map import render_json, validate_json, write_json_atomic

def test_json_output_is_deterministic_and_has_public_summary(self):
    days = parse_calendar(self.load("contributions.json"))
    first = render_json(days)
    self.assertEqual(first, render_json(days))
    payload = json.loads(first)
    self.assertEqual(payload["summary"], {"total": 9, "activeDays": 2, "peak": 7})
    self.assertEqual(payload["days"][1], {"date": "2026-08-18", "count": 2, "weekday": 2})

def test_invalid_json_does_not_replace_last_good_file(self):
    with tempfile.TemporaryDirectory() as directory:
        output = Path(directory) / "contributions.json"
        output.write_text('{"last":"good"}', encoding="utf-8")
        with self.assertRaises(ValueError):
            write_json_atomic('{"days":[]}', output)
        self.assertEqual(output.read_text(encoding="utf-8"), '{"last":"good"}')
```

- [ ] **Step 2: Run the focused Python tests and confirm imports fail**

Run: `python -B -m unittest tests.test_generate_contribution_map -v`

Expected: FAIL because `render_json`, `validate_json`, and `write_json_atomic` do not exist.

- [ ] **Step 3: Implement deterministic render and validation**

```python
def render_json(days: Sequence[ContributionDay]) -> str:
    ordered = sorted(days, key=lambda day: day.date)
    payload = {
        "range": {"start": ordered[0].date, "end": ordered[-1].date},
        "summary": {
            "total": sum(day.count for day in ordered),
            "activeDays": sum(day.count > 0 for day in ordered),
            "peak": max(day.count for day in ordered),
        },
        "days": [
            {"date": day.date, "count": day.count, "weekday": day.weekday}
            for day in ordered
        ],
    }
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"

def validate_json(text: str) -> None:
    try:
        payload = json.loads(text)
        days = payload["days"]
        summary = payload["summary"]
        date_range = payload["range"]
    except (json.JSONDecodeError, KeyError, TypeError) as error:
        raise ValueError("generated output is not expected contribution JSON") from error
    if not days or set(summary) != {"total", "activeDays", "peak"}:
        raise ValueError("generated contribution JSON is incomplete")
    if set(date_range) != {"start", "end"}:
        raise ValueError("generated contribution JSON has no valid range")
```

Use the existing validated temporary-file pattern for `write_json_atomic`. Extend `argparse` with `--json-output` and write JSON only when the flag is present.

- [ ] **Step 4: Generate the checked-in JSON and run tests**

Run:

```powershell
python scripts/generate_contribution_map.py --username AlpoTheo --input-json tests/fixtures/contributions.json --output assets/contribution-map.svg --json-output site/data/contributions.json
python -B -m unittest tests.test_generate_contribution_map -v
```

Expected: all focused tests PASS; JSON parses and reports total `9` for the fixture.

- [ ] **Step 5: Commit the data interface**

```bash
git add scripts/generate_contribution_map.py tests/test_generate_contribution_map.py site/data/contributions.json
git commit -m "feat: generate interactive contribution data"
```

---

### Task 2: Profile State Machine and Terminal

**Files:**
- Create: `package.json`
- Create: `site/core.js`
- Create: `site/data/profile.json`
- Create: `tests-js/core.test.js`

**Interfaces:**
- Produces: `ROUTES`, `createInitialState(saved)`, `reduce(state, action)`, `executeCommand(input, state)`, and `completion(state)`.
- State shape: `{activeRoute, mode, visitedRoutes, openedHaul, inspectedTerrain, terminalOpen}`.
- Command result: `{state, lines: string[], clear?: boolean}`.

- [ ] **Step 1: Add the package definition and failing Node tests**

```json
{
  "private": true,
  "type": "module",
  "scripts": {"test:js": "node --test tests-js/*.test.js"}
}
```

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce, executeCommand, completion } from '../site/core.js';

test('route selection updates shared state and exploration', () => {
  const state = reduce(createInitialState(), { type: 'SELECT_ROUTE', route: 'game' });
  assert.equal(state.activeRoute, 'game');
  assert.deepEqual(state.visitedRoutes, ['game']);
});

test('terminal select command uses the same route transition', () => {
  const result = executeCommand('select data', createInitialState());
  assert.equal(result.state.activeRoute, 'data');
  assert.match(result.lines.join(' '), /AI & DATA ENGINEERING/);
});

test('system mapped requires all routes, haul, and terrain', () => {
  let state = createInitialState();
  for (const route of ['data', 'game', 'core']) state = reduce(state, {type:'SELECT_ROUTE', route});
  state = reduce(state, {type:'OPEN_HAUL'});
  state = reduce(state, {type:'INSPECT_TERRAIN'});
  assert.equal(completion(state), true);
});

test('unknown commands return useful restrained feedback', () => {
  const result = executeCommand('xyz', createInitialState());
  assert.deepEqual(result.lines, ['UNKNOWN COMMAND: xyz', 'TYPE help FOR THE COMMAND INDEX.']);
});
```

- [ ] **Step 2: Run the Node tests and confirm the missing-module failure**

Run: `npm run test:js`

Expected: FAIL because `site/core.js` does not exist.

- [ ] **Step 3: Implement route state and command behavior**

Implement the exact route ids `data`, `game`, and `core`. `reduce` must return a new state, reject unknown route ids, deduplicate `visitedRoutes`, and support `SELECT_ROUTE`, `OPEN_HAUL`, `INSPECT_TERRAIN`, `SET_MODE`, `TOGGLE_TERMINAL`, and `RESET_PROGRESS`.

`executeCommand` must implement:

```text
help     -> command index
whoami   -> primary identity and three disciplines
routes   -> three route names
select X -> SELECT_ROUTE for data/game/core
haul     -> OPEN_HAUL and mission summary
terrain  -> INSPECT_TERRAIN and terrain mode
contact  -> GitHub, LinkedIn, and email
clear    -> clear=true with no output lines
exit     -> close terminal
```

Store authored display copy in `site/data/profile.json`; keep the state machine's command labels self-contained so Node tests do not require filesystem or network access.

- [ ] **Step 4: Run Node tests**

Run: `npm run test:js`

Expected: all core tests PASS.

- [ ] **Step 5: Commit the application core**

```bash
git add package.json site/core.js site/data/profile.json tests-js/core.test.js
git commit -m "feat: add profile game state and terminal"
```

---

### Task 3: Interactive Terrain Engine

**Files:**
- Create: `site/terrain.js`
- Create: `tests-js/terrain.test.js`

**Interfaces:**
- Produces: `heightForCount(count)`, `buildCells(days)`, `project(cell, camera)`, `hitTest(cells, point, camera)`, `clampCamera(camera)`, and `createTerrain(canvas, options)`.
- Camera shape: `{x: number, y: number, zoom: number}` with zoom clamped to `0.65..2.2`.
- `createTerrain` returns `{render, resize, pan, zoomAt, reset, selectNext, destroy}`.

- [ ] **Step 1: Write failing terrain math tests**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { heightForCount, buildCells, project, hitTest, clampCamera } from '../site/terrain.js';

const days = [
  {date:'2026-08-17', count:0, weekday:1},
  {date:'2026-08-18', count:7, weekday:2}
];

test('height levels are bounded and monotonic', () => {
  assert.deepEqual([0,1,3,7,12,40].map(heightForCount), [0,5,10,16,23,23]);
});

test('cell geometry preserves inspectable source data', () => {
  const cells = buildCells(days);
  assert.deepEqual(cells[1].day, days[1]);
  assert.equal(cells[1].height, 16);
});

test('camera zoom is clamped', () => {
  assert.equal(clampCamera({x:0,y:0,zoom:9}).zoom, 2.2);
  assert.equal(clampCamera({x:0,y:0,zoom:.1}).zoom, .65);
});

test('hit test selects the visually nearest projected cell', () => {
  const cells = buildCells(days);
  const camera = {x:0,y:0,zoom:1};
  const point = project(cells[1], camera);
  assert.equal(hitTest(cells, point, camera).day.date, '2026-08-18');
});
```

- [ ] **Step 2: Run Node tests and confirm the missing terrain module**

Run: `npm run test:js`

Expected: FAIL because `site/terrain.js` does not exist.

- [ ] **Step 3: Implement pure geometry and Canvas lifecycle**

Use week index `Math.floor(index / 7)` and weekday for isometric coordinates. Render inactive top diamonds in `#2A2A28`; active columns use `#FF5A36`, `#A93421`, and `#6D281E`. Device-pixel-ratio scaling must keep the Canvas sharp. Pointer drag pans, wheel zooms around the pointer, arrow keys move the selected day, and `reset` restores `{x:0,y:0,zoom:1}`.

The renderer must call `options.onInspect(day)` when pointer or keyboard selection changes and must remove every registered listener in `destroy`.

- [ ] **Step 4: Run all Node tests**

Run: `npm run test:js`

Expected: all core and terrain tests PASS.

- [ ] **Step 5: Commit the terrain engine**

```bash
git add site/terrain.js tests-js/terrain.test.js
git commit -m "feat: add interactive contribution terrain"
```

---

### Task 4: Semantic Game Shell and Authored Visual System

**Files:**
- Create: `site/index.html`
- Create: `site/styles.css`
- Create: `site/app.js`
- Create: `tests/test_site.py`

**Interfaces:**
- Consumes: `core.js`, `terrain.js`, `data/profile.json`, and `data/contributions.json`.
- Produces: the complete browser experience with route selection, terminal, HAUL nodes, terrain controls, persistence, and responsive behavior.

- [ ] **Step 1: Write failing site contract tests**

```python
class SiteTests(unittest.TestCase):
    def setUp(self):
        self.html = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
        self.css = (ROOT / "site" / "styles.css").read_text(encoding="utf-8")
        self.js = (ROOT / "site" / "app.js").read_text(encoding="utf-8")

    def test_semantic_interaction_surface_exists(self):
        for token in ('<h1', '<canvas', 'aria-live="polite"', 'data-route="data"',
                      'data-route="game"', 'data-route="core"', 'data-haul-node="teamwork"',
                      'data-haul-node="tension"', 'data-haul-node="risk"', 'data-haul-node="extraction"'):
            self.assertIn(token, self.html)

    def test_visual_system_is_authored_and_responsive(self):
        for color in ('#080808', '#F1EFE8', '#92928C', '#2A2A28', '#FF5A36'):
            self.assertIn(color, self.css)
        self.assertIn('@media (max-width: 720px)', self.css)
        self.assertIn('prefers-reduced-motion: reduce', self.css)
        for banned in ('linear-gradient', 'backdrop-filter', 'box-shadow: 0 0', '#7c3aed', '#06b6d4'):
            self.assertNotIn(banned, self.css.lower())

    def test_app_loads_local_data_and_persists_only_exploration(self):
        self.assertIn('./data/profile.json', self.js)
        self.assertIn('./data/contributions.json', self.js)
        self.assertIn('localStorage', self.js)
        self.assertNotIn('fetch("http', self.js)
```

- [ ] **Step 2: Run site tests and confirm files are missing**

Run: `python -B -m unittest tests.test_site -v`

Expected: FAIL with `FileNotFoundError`.

- [ ] **Step 3: Build the semantic HTML shell**

Create landmarks for header telemetry, build map, active route readout, HAUL overlay, terrain overlay, terminal, system progress, and footer contacts. Use real `<button>` controls with visible focus. Include fallback text inside the Canvas element and a noscript message with contacts.

- [ ] **Step 4: Implement the CSS visual system**

Use asymmetric rules, coordinate labels, system typography, functional selection markers, and a full-height desktop composition. Do not implement the page as repeated cards. At `720px`, convert it into a deliberate vertical mission console with 44 px minimum controls and no horizontal overflow. At reduced motion, disable boot sequencing, transforms, and smooth scrolling.

- [ ] **Step 5: Bind mechanics in `app.js`**

Load both JSON files with `Promise.all`. Restore only the state fields defined in the spec. Bind route buttons, keyboard navigation, terminal submission/history, HAUL nodes, terrain controls, reset, and escape behavior. Update the live region on meaningful changes. Boot must be skipped on reduced motion and shortened for returning visitors.

- [ ] **Step 6: Run Python and Node tests**

Run:

```powershell
python -B -m unittest tests.test_site -v
npm run test:js
```

Expected: all site, core, and terrain tests PASS.

- [ ] **Step 7: Commit the browser application**

```bash
git add site/index.html site/styles.css site/app.js tests/test_site.py
git commit -m "feat: build interactive profile console"
```

---

### Task 5: GitHub-Native Launch README

**Files:**
- Modify: `README.md`
- Modify: `tests/test_readme.py`

**Interfaces:**
- Produces: a README with `ENTER THE SYSTEM` linking to `https://alpotheo.github.io/AlpoTheo/`, three native route details, one HAUL detail, live terrain, contacts, and Pins handoff.

- [ ] **Step 1: Extend README tests before changing markup**

```python
def test_readme_is_a_native_launch_console(self):
    self.assertIn("ENTER THE SYSTEM", self.text)
    self.assertIn("https://alpotheo.github.io/AlpoTheo/", self.text)
    self.assertGreaterEqual(self.text.count("<details>"), 4)
    for label in ("AI & Data Engineering", "Game Development", "Computer Engineering", "HAUL"):
        self.assertIn(label, self.text)

def test_passive_panels_are_not_presented_as_controls(self):
    self.assertNotIn("./assets/focus-routes.svg", self.text)
    self.assertNotIn("./assets/haul-case-file.svg", self.text)
```

- [ ] **Step 2: Run README tests and confirm the old composition fails**

Run: `python -B -m unittest tests.test_readme -v`

Expected: FAIL because the launch URL and native expandable records are missing.

- [ ] **Step 3: Rewrite README as the launch console**

Keep the identity header as a visual introduction, followed by one prominent linked launch line. Add four closed `<details>` records with concise factual copy. Retain `assets/contribution-map.svg` without wrapping it in a deceptive control link. End with contacts and the existing Pins handoff.

- [ ] **Step 4: Run README tests**

Run: `python -B -m unittest tests.test_readme -v`

Expected: all README tests PASS.

- [ ] **Step 5: Commit the launch surface**

```bash
git add README.md tests/test_readme.py
git commit -m "feat: turn README into profile launch console"
```

---

### Task 6: Pages Build and Deployment Workflow

**Files:**
- Modify: `.github/workflows/update-profile-map.yml`
- Modify: `tests/test_workflow.py`

**Interfaces:**
- Consumes: profile source, generator, `GITHUB_TOKEN`, and Pages environment.
- Produces: refreshed SVG/JSON, a Pages artifact containing `site/`, a successful `github-pages` deployment, and generated-data commits without recursion.

- [ ] **Step 1: Add failing deployment workflow tests**

```python
def test_workflow_generates_both_formats_and_deploys_pages(self):
    for token in ("--json-output site/data/contributions.json", "actions/configure-pages@",
                  "actions/upload-pages-artifact@", "actions/deploy-pages@", "pages: write",
                  "id-token: write", "name: github-pages"):
        self.assertIn(token, self.text)

def test_generated_data_does_not_retrigger_push_workflow(self):
    self.assertNotIn("site/data/**", self.text)
    self.assertNotIn("assets/**", self.text)
```

- [ ] **Step 2: Run workflow tests and confirm deployment contract fails**

Run: `python -B -m unittest tests.test_workflow -v`

Expected: FAIL because Pages permissions/actions and JSON output are absent.

- [ ] **Step 3: Extend the workflow**

Add `pages: write` and `id-token: write`; generate SVG and JSON from one API response; upload `site/` with `actions/upload-pages-artifact`; deploy in a dependent job using the `github-pages` environment. Keep the push path allowlist limited to source, README, workflow, and tests so generated-data commits do not loop.

- [ ] **Step 4: Run workflow tests**

Run: `python -B -m unittest tests.test_workflow -v`

Expected: all workflow tests PASS.

- [ ] **Step 5: Commit automation**

```bash
git add .github/workflows/update-profile-map.yml tests/test_workflow.py
git commit -m "ci: deploy interactive profile to Pages"
```

---

### Task 7: Full Interaction and Visual Verification

**Files:**
- Verify: `site/*`, `README.md`, `assets/*`, `scripts/*`, `.github/workflows/*`
- Temporary only: `../qa-interactive/*`

**Interfaces:**
- Produces: automated evidence, browser interaction evidence, responsive screenshots, and a clean publishable commit tree.

- [ ] **Step 1: Run all automated tests and syntax checks**

Run:

```powershell
$env:PYTHONDONTWRITEBYTECODE='1'
python -B -m unittest discover -s tests -v
npm run test:js
node --check site/app.js
node --check site/core.js
node --check site/terrain.js
```

Expected: zero failures and zero syntax errors.

- [ ] **Step 2: Serve the site locally without a build step**

Run: `python -m http.server 4173 --directory site`

Expected: `http://127.0.0.1:4173/` serves `index.html`, local modules, and both JSON data files.

- [ ] **Step 3: Exercise real browser mechanics**

Using headless or controlled Microsoft Edge, verify:

- Route buttons and keyboard selection change the active route.
- `select game`, `haul`, `terrain`, `clear`, and an unknown command return the specified results.
- Four HAUL nodes change the mission detail.
- Terrain pointer inspection changes the date/count readout.
- Pan, zoom, and reset alter then restore the camera.
- Exploration persists across reload and reset clears it.

- [ ] **Step 4: Capture and inspect responsive states**

Capture desktop `1440×1000`, tablet `900×1100`, and mobile `360×900`; repeat desktop with reduced motion. Inspect black-theme consistency, control focus, terminal overflow, Canvas sharpness, clipping, and horizontal overflow.

- [ ] **Step 5: Verify no-JavaScript fallback**

Disable JavaScript or open the HTML without module execution. Confirm the visitor still sees identity, disciplines, HAUL summary, and contact links.

- [ ] **Step 6: Run repository hygiene checks**

Run:

```bash
git diff --check
git status --short
git diff --stat origin/main...HEAD
```

Expected: no untracked QA artifacts and only approved source, tests, docs, data, README, and workflow changes.

- [ ] **Step 7: Commit any visual corrections and rerun Steps 1–6**

```bash
git add README.md site assets scripts tests tests-js .github/workflows package.json
git commit -m "fix: polish interactive profile mechanics"
```

Expected: all automated and browser checks remain green.

---

### Task 8: Enable Pages, Publish, and Verify Live

**Files:**
- External state: GitHub Pages configuration and `origin/main`
- Public URLs: `https://github.com/AlpoTheo` and `https://alpotheo.github.io/AlpoTheo/`

**Interfaces:**
- Produces: the public README launch console and deployed interactive application.

- [ ] **Step 1: Confirm Pages configuration**

Run: `gh api repos/AlpoTheo/AlpoTheo/pages`

If the endpoint returns `404`, enable workflow builds with:

```bash
gh api --method POST repos/AlpoTheo/AlpoTheo/pages -f build_type=workflow
```

Expected: Pages reports `build_type: workflow` and the public URL.

- [ ] **Step 2: Refresh real contribution JSON locally without exposing the token**

Use `gh auth token` only as an in-memory `GITHUB_TOKEN`, run the generator with both output paths, clear the environment variable, rerun generator tests, and commit changed live data.

- [ ] **Step 3: Run the full verification suite on the exact push tree**

Run the Task 7 Step 1 command plus XML/JSON parsing and `git diff --check`.

Expected: every test passes and the tree is clean.

- [ ] **Step 4: Push `main`**

Run: `git push origin main`

Expected: the verified local tip becomes `origin/main`.

- [ ] **Step 5: Wait for and inspect the workflow**

Run:

```bash
gh api 'repos/AlpoTheo/AlpoTheo/actions/workflows/update-profile-map.yml/runs?per_page=3'
```

Expected: the push run reaches `completed/success` and the Pages deployment URL is present.

- [ ] **Step 6: Verify public assets and interactions**

Open both public URLs. Confirm `ENTER THE SYSTEM` opens the Pages site, all modules/data return HTTP 200, route/terminal/HAUL/terrain mechanics work, and mobile rendering has no overflow.

- [ ] **Step 7: Fetch final remote state and report evidence**

Run:

```bash
git fetch origin main
git log -3 --oneline origin/main
git status --short
```

Report the profile URL, Pages URL, commit, Python/Node test counts, workflow conclusion, and any GitHub Pages propagation delay.
