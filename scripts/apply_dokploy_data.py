#!/usr/bin/env python3
"""
Apply Dokploy match data to local template frontmatter.

Reads scripts/dokploy-matches.json (produced by fetch_dokploy_data.py) and
updates each matched template's index.md with:

  Always written (add or overwrite):
    - logoUrl
    - githubUrl
    - docsUrl
    - websiteUrl

  Written only when the frontmatter field is currently empty / absent:
    - description  (pass --overwrite-description to always replace)
    - tags         (pass --overwrite-tags to always replace; default: merge)

Usage:
    python scripts/apply_dokploy_data.py [--dry-run]
                                         [--overwrite-description]
                                         [--overwrite-tags]
                                         [template]

    template  Optional slug to apply data for only one template.
"""

import argparse
import re
import sys
from pathlib import Path

import yaml

# ── Constants ──────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).parent.parent
TEMPLATES_DIR = REPO_ROOT / "src" / "content" / "templates"
MATCHES_FILE = Path(__file__).parent / "dokploy-matches.json"

# Fields always overwritten from Dokploy data (they don't exist locally yet)
ALWAYS_OVERWRITE = {"logoUrl", "githubUrl", "docsUrl", "websiteUrl"}

_FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---", re.DOTALL)


class Colors:
    GREEN = "\033[92m"
    BLUE = "\033[94m"
    ORANGE = "\033[38;5;208m"
    YELLOW = "\033[33m"
    RED = "\033[91m"
    GREY = "\033[90m"
    ENDC = "\033[0m"


# ── Helpers ────────────────────────────────────────────────────────────────────


def read_frontmatter(path: Path) -> tuple[dict, str]:
    """Return (parsed_frontmatter_dict, raw_file_text)."""
    text = path.read_text(encoding="utf-8")
    m = _FRONTMATTER_RE.match(text)
    if not m:
        raise ValueError(f"No YAML frontmatter found in {path}")
    data = yaml.safe_load(m.group(1)) or {}
    return data, text


def write_frontmatter(path: Path, data: dict, original_text: str) -> None:
    """Replace the frontmatter block in the file with updated data."""
    new_fm = yaml.dump(data, allow_unicode=True, sort_keys=False, default_flow_style=False).rstrip()
    new_text = _FRONTMATTER_RE.sub(f"---\n{new_fm}\n---", original_text, count=1)
    path.write_text(new_text, encoding="utf-8")


def merge_tags(existing: list[str], incoming: list[str]) -> list[str]:
    """Union of tags preserving existing order, appending new ones."""
    seen = set(existing)
    return existing + [t for t in incoming if t not in seen]


# ── Main ───────────────────────────────────────────────────────────────────────


def main(
    dry_run: bool,
    overwrite_description: bool,
    overwrite_tags: bool,
    only_template: str | None = None,
) -> None:
    C = Colors

    if not MATCHES_FILE.exists():
        print(
            f"{C.RED}Error:{C.ENDC} {MATCHES_FILE.relative_to(REPO_ROOT)} not found. "
            "Run fetch_dokploy_data.py first.",
            file=sys.stderr,
        )
        sys.exit(1)

    import json

    all_matches: dict[str, dict] = json.loads(MATCHES_FILE.read_text())

    if only_template is not None:
        if only_template not in all_matches:
            print(
                f"{C.RED}Error:{C.ENDC} Template {C.YELLOW}{only_template!r}{C.ENDC}"
                f" not found in {MATCHES_FILE.relative_to(REPO_ROOT)}. "
                "Run fetch_dokploy_data.py first (optionally with the same slug).",
                file=sys.stderr,
            )
            sys.exit(1)
        matches = {only_template: all_matches[only_template]}
        print(
            f"{C.BLUE}Applying Dokploy data to single template:{C.ENDC}"
            f" {C.YELLOW}{only_template}{C.ENDC}\n"
        )
    else:
        matches = all_matches
        print(
            f"{C.BLUE}Applying Dokploy data to{C.ENDC} {len(matches)} matched templates …\n"
        )

    updated = 0
    skipped = 0
    errors: list[str] = []

    for slug, match in sorted(matches.items()):
        index_path = TEMPLATES_DIR / slug / "index.md"
        if not index_path.exists():
            print(
                f"  {C.RED}✗{C.ENDC}  {C.RED}{slug:<20}{C.ENDC}"
                f"  {C.GREY}index.md not found{C.ENDC}"
            )
            errors.append(slug)
            continue

        try:
            data, raw_text = read_frontmatter(index_path)
        except ValueError as exc:
            print(
                f"  {C.RED}✗{C.ENDC}  {C.RED}{slug:<20}{C.ENDC}"
                f"  {C.GREY}{exc}{C.ENDC}"
            )
            errors.append(slug)
            continue

        changes: list[str] = []

        # ── URL / logo fields (always overwrite) ──────────────────────────────
        for field in ("logoUrl", "githubUrl", "docsUrl", "websiteUrl"):
            value = match.get(field)
            if value:
                if data.get(field) != value:
                    data[field] = value
                    changes.append(field)
            else:
                # Explicitly set to None so the field is absent / null
                if field in data and data[field]:
                    pass  # keep existing non-null value
                elif value is None and field not in data:
                    pass  # don't add null fields

        # ── Description ───────────────────────────────────────────────────────
        new_desc: str = match.get("description", "").strip()
        if new_desc:
            current_desc: str = (data.get("description") or "").strip()
            if overwrite_description or not current_desc:
                if data.get("description", "").strip() != new_desc:
                    data["description"] = new_desc
                    changes.append("description")

        # ── Tags ──────────────────────────────────────────────────────────────
        new_tags: list[str] = match.get("tags", [])
        if new_tags:
            current_tags: list[str] = data.get("tags") or []
            if overwrite_tags:
                if current_tags != new_tags:
                    data["tags"] = new_tags
                    changes.append("tags")
            else:
                merged = merge_tags(current_tags, new_tags)
                if merged != current_tags:
                    data["tags"] = merged
                    changes.append("tags(merged)")

        if not changes:
            skipped += 1
            print(
                f"  {C.GREY}–{C.ENDC}  {slug:<20}"
                f"  {C.GREY}no changes{C.ENDC}"
            )
            continue

        if not dry_run:
            write_frontmatter(index_path, data, raw_text)

        updated += 1
        dry_tag = f"  {C.GREY}(dry-run){C.ENDC}" if dry_run else ""
        change_list = f"{C.GREY}[{', '.join(changes)}]{C.ENDC}"
        print(
            f"  {C.GREEN}✓{C.ENDC}  {slug:<20}  {change_list}{dry_tag}"
        )

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{C.GREY}{'─' * 50}{C.ENDC}")
    print(f"Updated: {C.GREEN}{updated}{C.ENDC}")
    print(f"Skipped: {C.GREY}{skipped}{C.ENDC}")
    error_color = C.RED if errors else C.GREY
    print(f"Errors:  {error_color}{len(errors)}{C.ENDC}")
    if errors:
        print(f"  {C.RED}{', '.join(errors)}{C.ENDC}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "template",
        nargs="?",
        default=None,
        help="Optional template slug to apply data for only one template.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would change without writing any files.",
    )
    parser.add_argument(
        "--overwrite-description",
        action="store_true",
        help="Replace existing description with Dokploy's (default: only fill empty).",
    )
    parser.add_argument(
        "--overwrite-tags",
        action="store_true",
        help="Replace existing tags entirely (default: merge / union).",
    )
    args = parser.parse_args()

    C = Colors
    if args.dry_run:
        print(f"{C.YELLOW}[DRY RUN]{C.ENDC} No files will be written.\n")

    main(
        dry_run=args.dry_run,
        overwrite_description=args.overwrite_description,
        overwrite_tags=args.overwrite_tags,
        only_template=args.template,
    )
