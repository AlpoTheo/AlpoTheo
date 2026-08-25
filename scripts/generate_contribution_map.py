#!/usr/bin/env python3
"""Render a GitHub contribution calendar as a repository-owned SVG terrain."""

from __future__ import annotations

import argparse
import html
import json
import os
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


@dataclass(frozen=True)
class ContributionDay:
    date: str
    count: int
    weekday: int


def parse_calendar(payload: dict) -> list[ContributionDay]:
    """Extract contribution days from a GitHub GraphQL response."""
    try:
        weeks = payload["data"]["user"]["contributionsCollection"][
            "contributionCalendar"
        ]["weeks"]
    except (KeyError, TypeError) as error:
        raise ValueError("response does not contain a contribution calendar") from error

    days: list[ContributionDay] = []
    try:
        for week in weeks:
            for day in week.get("contributionDays", []):
                contribution = ContributionDay(
                    date=str(day["date"]),
                    count=int(day["contributionCount"]),
                    weekday=int(day["weekday"]),
                )
                if contribution.count < 0 or not 0 <= contribution.weekday <= 6:
                    raise ValueError
                days.append(contribution)
    except (KeyError, TypeError, ValueError) as error:
        raise ValueError("contribution calendar contains an invalid day") from error

    if not days:
        raise ValueError("contribution calendar is empty")
    return days


def fetch_calendar(username: str, token: str) -> dict:
    """Fetch a public contribution calendar through GitHub GraphQL."""
    query = """query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            weeks { contributionDays { date contributionCount weekday } }
          }
        }
      }
    }"""
    body = json.dumps({"query": query, "variables": {"login": username}}).encode(
        "utf-8"
    )
    request = urllib.request.Request(
        "https://api.github.com/graphql",
        data=body,
        headers={
            "Authorization": f"bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "AlpoTheo-profile-map",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.load(response)
    if payload.get("errors"):
        message = payload["errors"][0].get("message", "unknown error")
        raise RuntimeError(f"GitHub GraphQL error: {message}")
    return payload


def _height(count: int) -> int:
    if count == 0:
        return 0
    if count <= 2:
        return 5
    if count <= 5:
        return 10
    if count <= 9:
        return 16
    return 23


def _terrain_cell(day: ContributionDay, index: int) -> str:
    week = index // 7
    x = 340 + week * 8.5 - day.weekday * 4.5
    y = 145 + week * 2.1 + day.weekday * 4.2
    height = _height(day.count)
    top_color = "#FF5A36" if day.count else "#2A2A28"
    side_color = "#A93421" if day.count else "#181817"
    opacity = "1" if day.count >= 5 else ".72" if day.count else "1"
    top = (
        f"{x:.1f},{y-height:.1f} {x+5.4:.1f},{y+2.7-height:.1f} "
        f"{x:.1f},{y+5.4-height:.1f} {x-5.4:.1f},{y+2.7-height:.1f}"
    )
    escaped_date = html.escape(day.date)
    parts = [
        f'<g data-terrain-cell="true"><title>{escaped_date}: {day.count} contributions</title>'
    ]
    if height:
        right = (
            f"{x+5.4:.1f},{y+2.7-height:.1f} {x:.1f},{y+5.4-height:.1f} "
            f"{x:.1f},{y+5.4:.1f} {x+5.4:.1f},{y+2.7:.1f}"
        )
        left = (
            f"{x-5.4:.1f},{y+2.7-height:.1f} {x:.1f},{y+5.4-height:.1f} "
            f"{x:.1f},{y+5.4:.1f} {x-5.4:.1f},{y+2.7:.1f}"
        )
        parts.append(f'<polygon points="{left}" fill="#6D281E" fill-opacity="{opacity}"/>')
        parts.append(f'<polygon points="{right}" fill="{side_color}" fill-opacity="{opacity}"/>')
    parts.append(f'<polygon points="{top}" fill="{top_color}" fill-opacity="{opacity}"/>')
    parts.append("</g>")
    return "".join(parts)


def render_svg(days: Sequence[ContributionDay]) -> str:
    """Create a deterministic 900×340 SVG from contribution days."""
    ordered = sorted(days, key=lambda day: day.date)
    total = sum(day.count for day in ordered)
    active_days = sum(day.count > 0 for day in ordered)
    peak = max((day.count for day in ordered), default=0)
    cells = "".join(_terrain_cell(day, index) for index, day in enumerate(ordered))
    empty_state = (
        '<text class="empty" x="560" y="285" text-anchor="middle">'
        "NO PUBLIC ACTIVITY IN RANGE</text>"
        if total == 0
        else ""
    )
    start = html.escape(ordered[0].date) if ordered else "—"
    end = html.escape(ordered[-1].date) if ordered else "—"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 340" role="img" aria-labelledby="title desc">
  <title id="title">AlpoTheo contribution terrain</title>
  <desc id="desc">Public GitHub activity from {start} to {end}, rendered as an isometric terrain map.</desc>
  <rect width="900" height="340" fill="#080808"/>
  <style>
    .mono {{ font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }}
    .eyebrow {{ fill: #FF5A36; font-size: 12px; font-weight: 700; letter-spacing: 2px; }}
    .title {{ fill: #F1EFE8; font-size: 25px; font-weight: 700; letter-spacing: -.4px; }}
    .muted {{ fill: #92928C; font-size: 12px; }}
    .metric {{ fill: #F1EFE8; font-size: 18px; font-weight: 700; }}
    .empty {{ fill: #92928C; font: 11px ui-monospace, SFMono-Regular, Consolas, monospace; letter-spacing: 1.2px; }}
  </style>
  <path d="M30 26H870M30 314H870" stroke="#2A2A28"/>
  <text class="mono eyebrow" x="34" y="59">ACTIVITY / 365D</text>
  <text class="mono title" x="34" y="91">CONTRIBUTION TERRAIN</text>
  <text class="mono muted" x="34" y="116">PUBLIC SIGNAL, RENDERED AS WORLD DATA.</text>
  <g transform="translate(0 0)">{cells}</g>
  {empty_state}
  <g class="mono" transform="translate(34 166)">
    <text class="metric" y="0">{total}</text><text class="muted" y="20">CONTRIBUTIONS</text>
    <text class="metric" y="58">{active_days}</text><text class="muted" y="78">ACTIVE DAYS</text>
    <text class="metric" y="116">{peak}</text><text class="muted" y="136">PEAK DAY</text>
  </g>
  <text class="mono muted" x="866" y="306" text-anchor="end">{start} — {end}</text>
</svg>
'''


def validate_svg(svg: str) -> None:
    """Reject malformed or unexpected output before replacing the last good map."""
    try:
        root = ET.fromstring(svg)
    except ET.ParseError as error:
        raise ValueError("generated output is not valid XML") from error
    if not root.tag.endswith("svg") or root.attrib.get("viewBox") != "0 0 900 340":
        raise ValueError("generated output is not the expected SVG canvas")
    if not any(node.attrib.get("data-terrain-cell") == "true" for node in root.iter()):
        raise ValueError("generated SVG has no terrain cells")


def write_svg_atomic(svg: str, output_path: Path) -> None:
    """Validate and atomically replace the output, preserving the last good file."""
    validate_svg(svg)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            "w", encoding="utf-8", newline="\n", delete=False, dir=output_path.parent
        ) as stream:
            stream.write(svg)
            temporary = Path(stream.name)
        temporary.replace(output_path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--username", required=True)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--input-json", type=Path)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.input_json:
        payload = json.loads(args.input_json.read_text(encoding="utf-8"))
    else:
        token = os.environ.get("GITHUB_TOKEN")
        if not token:
            raise SystemExit("GITHUB_TOKEN is required when --input-json is not provided")
        payload = fetch_calendar(args.username, token)
    svg = render_svg(parse_calendar(payload))
    write_svg_atomic(svg, args.output)


if __name__ == "__main__":
    main()
