#!/usr/bin/env python3
"""
Fetch template metadata and logos from the Dokploy templates repository.

For each local template that has a matching entry in Dokploy's index, this script:
  - Downloads the logo to public/logos/{slug}.{ext}
  - Records github_url, docs_url, website_url, and logo_url in a local match file

The Dokploy index (meta.json) is saved to scripts/dokploy-index.json.
The match results are saved to scripts/dokploy-matches.json for use by
apply_dokploy_data.py which updates the template frontmatter.

Usage:
    python scripts/fetch_dokploy_data.py [--dry-run] [template]

    template  Optional slug to process only one template (upserts into existing
              matches file rather than replacing it).
"""

import argparse
import json
import sys
from pathlib import Path

import requests

# ── Constants ──────────────────────────────────────────────────────────────────

META_URL = "https://raw.githubusercontent.com/Dokploy/templates/main/meta.json"
LOGO_BASE_URL = "https://raw.githubusercontent.com/Dokploy/templates/main/blueprints"

REPO_ROOT = Path(__file__).parent.parent
TEMPLATES_DIR = REPO_ROOT / "src" / "content" / "templates"
LOGOS_DIR = REPO_ROOT / "public" / "logos"
INDEX_FILE = Path(__file__).parent / "dokploy-index.json"
MATCHES_FILE = Path(__file__).parent / "dokploy-matches.json"

# Explicit overrides for slugs that don't match Dokploy IDs directly.
# Maps our slug → Dokploy id.
SLUG_OVERRIDES: dict[str, str] = {
    "affine": "affinepro",
    "gitea": "gitea-postgres",
    "openpanel-v1": "openpanel",
    "openpanel-v2": "openpanel",
    "mongo": "mongodb",
    "postgres": "postgresql",
}


class Colors:
    GREEN = "\033[92m"
    BLUE = "\033[94m"
    ORANGE = "\033[38;5;208m"
    YELLOW = "\033[33m"
    RED = "\033[91m"
    GREY = "\033[90m"
    ENDC = "\033[0m"  # Reset to default color


# ── Helpers ────────────────────────────────────────────────────────────────────


def normalize(s: str) -> str:
    """Lowercase and strip all non-alphanumeric characters for fuzzy matching."""
    return "".join(c for c in s.lower() if c.isalnum())


def get_local_slugs() -> list[str]:
    """Return sorted list of template slugs from src/content/templates/."""
    return sorted(
        d.name
        for d in TEMPLATES_DIR.iterdir()
        if d.is_dir() and (d / "index.md").exists()
    )


def build_lookup(index: list[dict]) -> tuple[dict[str, dict], dict[str, dict]]:
    """Build id → entry and normalized-name → entry lookup maps."""
    by_id: dict[str, dict] = {}
    by_norm: dict[str, dict] = {}
    for item in index:
        by_id[item["id"]] = item
        by_norm[normalize(item["id"])] = item
        by_norm[normalize(item["name"])] = item
    return by_id, by_norm


def find_match(
    slug: str,
    by_id: dict[str, dict],
    by_norm: dict[str, dict],
) -> dict | None:
    """Find a Dokploy entry for our slug, using overrides then fuzzy matching."""
    candidates = [SLUG_OVERRIDES.get(slug, slug), slug]
    for candidate in candidates:
        if candidate in by_id:
            return by_id[candidate]
        norm = normalize(candidate)
        if norm in by_norm:
            return by_norm[norm]
    return None


def download_logo(
    dokploy_id: str,
    logo_filename: str,
    dest: Path,
    session: requests.Session,
) -> bool:
    """Download a logo from Dokploy's blueprints directory."""
    C = Colors
    url = f"{LOGO_BASE_URL}/{dokploy_id}/{logo_filename}"
    try:
        resp = session.get(url, timeout=15)
        resp.raise_for_status()
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(resp.content)
        return True
    except requests.RequestException as exc:
        print(f"    {C.RED}✗ Failed to download logo:{C.ENDC} {exc}")
        return False


# ── Main ───────────────────────────────────────────────────────────────────────


def main(dry_run: bool, only_template: str | None = None) -> None:
    C = Colors
    session = requests.Session()
    session.headers["User-Agent"] = "zaneops-template-fetcher/1.0"

    # 1. Fetch and save the Dokploy index
    print(f"{C.BLUE}Fetching Dokploy meta.json …{C.ENDC}")
    resp = session.get(META_URL, timeout=30)
    resp.raise_for_status()
    index: list[dict] = resp.json()
    print(f"  {C.GREY}{len(index)} entries found{C.ENDC}")

    if not dry_run:
        INDEX_FILE.write_text(json.dumps(index, indent=2))
        print(
            f"  {C.GREEN}Saved{C.ENDC}"
            f" {C.GREY}→ {INDEX_FILE.relative_to(REPO_ROOT)}{C.ENDC}"
        )

    by_id, by_norm = build_lookup(index)
    all_local_slugs = get_local_slugs()

    if only_template is not None:
        if only_template not in all_local_slugs:
            print(
                f"\n{C.RED}Error:{C.ENDC} Template {C.YELLOW}{only_template!r}{C.ENDC}"
                f" not found in {TEMPLATES_DIR.relative_to(REPO_ROOT)}.",
                file=sys.stderr,
            )
            sys.exit(1)
        local_slugs = [only_template]
        print(
            f"\n{C.BLUE}Processing single template:{C.ENDC}"
            f" {C.YELLOW}{only_template}{C.ENDC}\n"
        )
    else:
        local_slugs = all_local_slugs
        print(f"\n{C.BLUE}Processing {len(local_slugs)} local templates …{C.ENDC}\n")

    matched: dict[str, dict] = {}
    unmatched: list[str] = []

    for slug in local_slugs:
        entry = find_match(slug, by_id, by_norm)

        if entry is None:
            unmatched.append(slug)
            print(
                f"  {C.RED}✗{C.ENDC}  {C.RED}{slug:<20}{C.ENDC}"
                f"  {C.GREY}(no match in Dokploy index){C.ENDC}"
            )
            continue

        dokploy_id = entry["id"]
        logo_filename: str = entry.get("logo", "")
        links: dict = entry.get("links", {})

        # Determine logo destination
        logo_ext = Path(logo_filename).suffix if logo_filename else ""
        logo_dest = LOGOS_DIR / f"{slug}{logo_ext}"
        logo_public_path = f"/logos/{slug}{logo_ext}" if logo_ext else None

        # Download logo
        logo_ok = False
        if logo_filename and not dry_run:
            logo_ok = download_logo(dokploy_id, logo_filename, logo_dest, session)
        elif logo_filename and dry_run:
            logo_ok = True  # pretend it succeeded in dry-run

        matched[slug] = {
            "dokploy_id": dokploy_id,
            "name": entry["name"],
            "description": entry.get("description", ""),
            "tags": entry.get("tags", []),
            "logoUrl": logo_public_path if logo_ok else None,
            "githubUrl": links.get("github") or None,
            "docsUrl": links.get("docs") or None,
            "websiteUrl": links.get("website") or None,
        }

        if logo_ok:
            status = f"{C.GREEN}✓{C.ENDC}"
            slug_col = f"{slug:<20}"
        else:
            status = f"{C.ORANGE}~{C.ENDC}"
            slug_col = f"{C.YELLOW}{slug:<20}{C.ENDC}"

        dry_tag = f"  {C.GREY}(dry-run){C.ENDC}" if dry_run else ""
        print(
            f"  {status}  {slug_col}"
            f" {C.GREY}→ {dokploy_id}{C.ENDC}{dry_tag}"
        )

    # 2. Save match results
    if not dry_run:
        if only_template is not None and MATCHES_FILE.exists():
            # Upsert: preserve existing entries for other templates
            existing: dict[str, dict] = json.loads(MATCHES_FILE.read_text())
            existing.update(matched)
            matched = existing
        MATCHES_FILE.write_text(json.dumps(matched, indent=2))
        print(
            f"\n{C.GREEN}Saved matches{C.ENDC}"
            f" {C.GREY}→ {MATCHES_FILE.relative_to(REPO_ROOT)}{C.ENDC}"
        )

    # 3. Summary
    print(f"\n{C.GREY}{'─' * 50}{C.ENDC}")
    print(f"Matched:   {C.GREEN}{len(matched)}{C.ENDC}/{len(local_slugs)}")
    unmatched_color = C.RED if unmatched else C.GREY
    print(f"Unmatched: {unmatched_color}{len(unmatched)}{C.ENDC}")
    if unmatched:
        print(f"  {C.RED}{', '.join(unmatched)}{C.ENDC}")
    if not dry_run:
        print(
            f"\n{C.BLUE}Run  python scripts/apply_dokploy_data.py"
            f"  to update template frontmatter.{C.ENDC}"
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "template",
        nargs="?",
        default=None,
        help="Optional template slug to process only one template.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would happen without writing any files.",
    )
    args = parser.parse_args()

    if args.dry_run:
        print(f"{Colors.YELLOW}[DRY RUN]{Colors.ENDC} No files will be written.\n")

    try:
        main(dry_run=args.dry_run, only_template=args.template)
    except requests.RequestException as exc:
        print(f"\n{Colors.RED}Network error:{Colors.ENDC} {exc}", file=sys.stderr)
        sys.exit(1)
