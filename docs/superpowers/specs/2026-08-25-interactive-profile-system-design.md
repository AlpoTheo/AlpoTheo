# Interactive GitHub Profile System Design

**Date:** 2026-08-25  
**Owner:** AlpoTheo  
**Status:** Approved concept, implementation pending

## Purpose

Replace the current image-led profile with a two-layer experience:

1. A concise GitHub-native README that behaves as a launch console using only interactions GitHub preserves.
2. A real, full-screen profile game hosted on GitHub Pages and built with repository-owned HTML, CSS, JavaScript, and Canvas.

The experience must feel authored, mechanically coherent, and professional. It must not resemble a generated portfolio template, a LinkedIn timeline, or an AI-themed landing page.

## Platform Boundary

GitHub sanitizes rendered README HTML, removing scripts, inline styles, classes, and other unsafe content. SVGs embedded through `<img>` are passive images, so their internal controls cannot provide a dependable profile interaction model.

The README may use links, headings, code, keyboard-key labels, and native `<details>/<summary>` sections. All JavaScript-driven mechanics live on GitHub Pages at:

`https://alpotheo.github.io/AlpoTheo/`

The Pages site will be deployed from the profile repository rather than replacing or depending on the separate `alpotheo.github.io` repository.

## Experience Architecture

### Layer 1: GitHub Launch Console

The README is shortened and restructured around one clear action: `ENTER THE SYSTEM`.

It contains:

- A slim identity header rather than four stacked image panels.
- A direct, highly visible link to the interactive profile.
- Three native expandable route records: AI & Data Engineering, Game Development, and Computer Engineering.
- A compact HAUL mission record.
- The automatically updated contribution terrain as a supporting signal rather than the main interface.
- GitHub, LinkedIn, and email links in a small footer.
- A handoff to GitHub Pinned repositories below the README.

Decorative SVGs are no longer presented as if they are interactive controls. Clicking the launch control opens the Pages application; other README controls disclose real content in place.

### Layer 2: Interactive Profile Game

The Pages application is a single-screen system console with several modes. It is not a conventional scrolling portfolio.

#### Boot

- A brief, skippable boot sequence establishes the interface.
- Returning visitors bypass most of the sequence through local state.
- Reduced-motion users receive an immediate static entrance.

#### Build Map

- Three route nodes represent AI & Data Engineering, Game Development, and Computer Engineering.
- Mouse, touch, arrow keys, and `W/A/S/D` can move focus between nodes.
- Selecting a route changes the system diagram, copy, loadout, and accent behavior without navigating away.
- Route content describes practice and interests, not inflated expertise levels or fake metrics.

#### Command Terminal

- A working command prompt supports `help`, `whoami`, `routes`, `select`, `haul`, `terrain`, `contact`, `clear`, and `exit`.
- Command history is available with arrow keys.
- Commands update the same central application state used by pointer navigation.
- Unknown commands return restrained, useful feedback rather than role-play filler.
- A small set of authored easter eggs may exist, but none use cliché hacker, Matrix, or “sudo access granted” copy.

#### HAUL Mission Record

- HAUL is treated as a completed game case file.
- A schematic mission map exposes selectable nodes for teamwork, tension, risk, and extraction.
- Selecting a node reveals a short design note and updates the mission loop diagram.
- The record states only verified facts: completed CENG 454 project, four-player co-op, and extraction horror.
- No repository link is invented.

#### Contribution Terrain

- The existing GitHub contribution calendar becomes an interactive Canvas terrain.
- Pointer or keyboard focus reveals date and contribution count.
- Drag pans the terrain; wheel/pinch or explicit controls zoom within safe limits.
- A reset control restores the authored camera position.
- Empty and loading states remain intentional and legible.
- The terrain never exposes private repository names, commit messages, or sensitive activity details.

#### Exploration State

- Visiting each route, opening the HAUL record, and inspecting the terrain marks exploration progress.
- Progress is stored locally in the browser and can be reset.
- Completion unlocks a restrained “SYSTEM MAPPED” state, not a confetti animation or gamified score.

## Visual Direction

The system uses an industrial game-interface language informed by source tools, tactical mission displays, and printed engineering diagrams.

### Palette

- Background: `#080808`
- Primary text: `#F1EFE8`
- Secondary text: `#92928C`
- Rules and inactive geometry: `#2A2A28`
- Single expressive accent: `#FF5A36`

### Typography

- Large identity copy uses a neutral grotesk system stack.
- Controls, telemetry, and terminal text use a system monospace stack.
- No external font dependency is required.
- Type scales remain readable on 360 px mobile widths and large desktop screens.

### Anti-Template Rules

The implementation must not use:

- Gradients, glassmorphism, neon purple/cyan, glow-heavy cyberpunk, or particle backgrounds.
- Generic bento cards, floating pills, typing-name banners, trophy walls, visitor counters, or logo clouds.
- Fake terminal noise, fabricated status values, skill percentages, or “available for work” claims.
- Large decorative blobs, abstract AI brains, circuit-head illustrations, or robot motifs.
- Excessive animation that exists without a mechanic.

Every moving element must communicate state, navigation, focus, loading, or spatial response.

## Responsive Interaction

### Desktop

- The viewport is divided into navigation telemetry, the active system canvas, and the command terminal.
- Keyboard and pointer interaction have equal capability.
- The layout targets 1280–1600 px widths without becoming a dashboard grid.

### Mobile

- Panels become a controlled vertical sequence rather than a scaled-down desktop canvas.
- Route selection uses large touch targets.
- The terminal remains usable with the software keyboard.
- Terrain controls include explicit zoom and reset buttons; touch gestures are optional enhancements.
- No horizontal page overflow is allowed at 360 px.

## Technical Structure

The site uses no frontend framework and no runtime package dependency.

```text
site/
  index.html
  styles.css
  app.js
  core.js
  terrain.js
  data/
    profile.json
    contributions.json
```

- `index.html` provides the semantic application shell and accessible fallback content.
- `styles.css` owns the complete visual system, responsive layout, focus states, and reduced-motion behavior.
- `core.js` owns the state machine, route definitions, command parsing, history, and exploration progress.
- `terrain.js` owns Canvas rendering, hit testing, keyboard selection, pan, zoom, and resize behavior.
- `app.js` binds DOM events to the core state and renderers.
- `profile.json` contains stable authored copy.
- `contributions.json` contains only dates, counts, and weekdays generated from GitHub's contribution calendar.

The existing Python generator gains a JSON output interface so one GraphQL response drives both README SVG and interactive Canvas data. Generated output is validated and written atomically.

## Data and Automation Flow

1. A scheduled/manual workflow queries GitHub GraphQL using the repository `GITHUB_TOKEN`.
2. The Python generator validates the response.
3. It writes `assets/contribution-map.svg` and `site/data/contributions.json` atomically.
4. The workflow commits changed generated assets only when content differs.
5. A Pages workflow deploys the `site/` directory on relevant source changes and can also deploy the freshly generated scheduled artifact in the same run.
6. Generated-asset commits are excluded from recursive trigger loops.

If the GitHub request fails, the last committed good SVG and JSON remain available. The site displays an authored unavailable state only if neither asset can be loaded.

## Accessibility and Safety

- Semantic landmarks and one visible `h1` are present.
- All mechanics are keyboard-operable.
- Focus is visible and never encoded only by color.
- A live region announces route and terminal changes without reading decorative telemetry.
- Canvas has an equivalent accessible day list or focused-day status.
- `prefers-reduced-motion` removes boot delays and motion transitions.
- Color contrast is checked against the black background.
- No analytics, cookies, external trackers, external scripts, or third-party profile-rendering services are added.
- Local storage contains exploration flags only and can be cleared from the interface.

## Test and Verification Strategy

- Python `unittest` covers contribution parsing, SVG generation, JSON generation, validation, and atomic writes.
- Node's built-in test runner covers the pure command parser, route state machine, exploration progress, and terrain math without third-party dependencies.
- Python contract tests parse README, HTML, SVG, JSON, and workflows to enforce links, accessibility hooks, banned patterns, and deployment paths.
- Headless Microsoft Edge renders desktop, tablet, 360 px mobile, reduced-motion, and no-JavaScript states.
- Visual QA checks clipping, focus visibility, interaction feedback, terminal overflow, Canvas hit targets, and black-theme consistency.
- A live GitHub Pages check confirms the deployed URL, application assets, and workflow conclusion.

## Acceptance Criteria

- The GitHub README no longer presents passive panels as controls.
- A visitor can reach the interactive system through one obvious action.
- All three routes can be selected by mouse, keyboard, and touch.
- Terminal commands alter the same route and dossier state as visual controls.
- HAUL has at least four meaningful selectable mission nodes.
- Contribution days can be inspected and the terrain can be panned, zoomed, and reset.
- Exploration progress persists locally and has a visible reset path.
- The full experience works at 360 px and with reduced motion.
- The site contains no obvious AI-template visual or writing patterns listed above.
- GitHub Pages deploys successfully and the public profile links to the live application.
