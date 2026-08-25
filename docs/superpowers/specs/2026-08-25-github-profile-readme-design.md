# GitHub Profile README Redesign

Date: 2026-08-25

## Objective

Replace the current generic profile README with a GitHub-native, black, game-inspired profile that feels authored and professional. The result must communicate Alp Doruk Şengün's Computer Engineering identity, AI/Data Engineering direction, and game-development interest without reading like a LinkedIn résumé or a generated README template.

## Design principles

- Use a true black visual system with warm-white text, restrained gray rules, and one signal-orange accent.
- Derive the game theme from menus, routes, maps, build labels, and system diagrams rather than neon cyberpunk decoration.
- Keep claims factual and modest. Do not present inactive or private work as a current public project.
- Avoid a large project gallery. GitHub's native Pinned repositories section remains the source of truth for selected public work.
- Avoid typing banners, trophy walls, generic GitHub Stats cards, standard snake animations, skill percentages, and technology-logo walls.
- Keep LinkedIn as a small contact link, not the content model for the profile.

## Information architecture

### 1. Player build header

A repository-owned SVG introduces:

- Alp Doruk Şengün
- Computer Engineering
- AI & Data Engineering
- Game Development

The header includes a small three-route system map. It contains no current-employment or active-project claim.

### 2. Short introduction

Two concise English sentences explain that Alp studies systems from data and learning algorithms through interaction loops and playable mechanics.

### 3. Focus routes

Three stable areas replace project cards:

- AI & Data Engineering
- Game Development
- Computer Engineering foundations

Each route uses concrete engineering vocabulary and remains valid even when the current work is private.

### 4. HAUL case file

HAUL replaces Core Breach as the main game-development example. The section states only verified facts:

- Four-player co-op
- Extraction horror
- CENG 454 Game Programming project
- Completed

No public repository link is invented.

### 5. Contribution world map

A generated SVG translates GitHub's contribution calendar into a black isometric terrain or level map. Activity determines cell height/intensity. The map is visually integrated with the profile and replaces generic stats/snake widgets.

The map displays contribution counts only. Private repository names, commit messages, and other sensitive details are never requested or rendered. If private contributions are visible in GitHub's anonymized profile data, only their daily counts may contribute to the terrain.

### 6. Loadout and native pins handoff

A compact loadout names only tools supported by verified public work. The README then points visitors toward the Pinned repositories section that GitHub renders below it. Projects are curated through GitHub Pins rather than duplicated in README markup.

### 7. Contact footer

Small text links:

- GitHub: `https://github.com/AlpoTheo`
- LinkedIn: `https://www.linkedin.com/in/alpsengun/`
- Email: `mailto:alpotheo@gmail.com`

## Repository structure

```text
README.md
assets/
  profile-header.svg
  focus-routes.svg
  haul-case-file.svg
  contribution-map.svg
scripts/
  generate_contribution_map.py
.github/
  workflows/
    update-profile-map.yml
```

The static assets are hand-authored SVGs with explicit black backgrounds so they remain consistent in both GitHub light and dark themes.

## Dynamic update flow

1. A scheduled GitHub Actions workflow runs weekly and can also be triggered manually.
2. It queries GitHub's GraphQL API for `AlpoTheo`'s contribution calendar using the workflow token.
3. The Python generator validates the response and creates the SVG in a temporary path.
4. The script checks that the SVG is non-empty, contains the expected root element, and has no unescaped external content.
5. The workflow atomically replaces `assets/contribution-map.svg` only after validation.
6. It commits the asset only when its content changed.

The generator uses the Python standard library only. No package installation or third-party profile-rendering service is required.

## Failure handling

- API/network failure: exit non-zero and preserve the last successful SVG.
- Missing or malformed contribution data: emit a clear workflow error and preserve the last successful SVG.
- No public activity: generate a valid low-elevation map rather than a broken image.
- Scheduled workflow inactivity: manual dispatch remains available. The static README and other SVGs remain complete without the dynamic map update.
- Push race or permission error: the workflow fails without rewriting README content.

## Accessibility and compatibility

- All SVGs use explicit backgrounds and high-contrast text.
- README images include meaningful alt text.
- Important identity and contact information also appears as Markdown text, not only inside SVGs.
- SVG typography uses reliable system fallbacks.
- Text remains legible at GitHub's mobile README width.
- Motion, if used, is limited to a subtle cursor or route signal and is not required to understand the content.

## Verification

Before publishing:

1. Parse every SVG as XML.
2. Scan README links and verify repository-owned asset paths.
3. Run the contribution generator against a saved fixture and validate deterministic output.
4. Run the generator in a no-contribution fixture and confirm a valid fallback map.
5. Render the SVGs to PNG and inspect desktop/mobile legibility.
6. Preview README rendering locally where practical.
7. Confirm the workflow has minimal `contents: write` permission and no repository secrets beyond the standard workflow token.
8. Confirm `git diff` contains no unrelated changes.

## Publishing

Implementation is committed to the profile repository and pushed to its default branch only after verification. Because the profile repository is public, the README and generated assets become immediately visible at `https://github.com/AlpoTheo` after the push completes.
