#!/usr/bin/env python3
"""Lint a saved GitHub issue body against the repository agentic contract."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


DEFAULT_CONTRACT = Path(__file__).resolve().parents[2] / "agentic" / "contract.json"
HEADING_RE = re.compile(r"^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$", re.MULTILINE)
CHECKBOX_RE = re.compile(r"^\s*(?:[-*+]\s+|\d+[.)]\s+)\[[ xX]\]\s+\S", re.MULTILINE)


def _normalise_heading(value: str) -> str:
    value = re.sub(r"[*_`]", "", value)
    return re.sub(r"\s+", " ", value.strip()).casefold()


def _label_name(label: Any) -> str:
    if isinstance(label, str):
        return label.strip()
    if isinstance(label, dict):
        return str(label.get("name", "")).strip()
    return ""


def parse_labels(values: list[str]) -> set[str]:
    return {
        label
        for value in values
        for label in (_label_name(part) for part in value.split(","))
        if label
    }


def load_issue(path: Path) -> tuple[str, set[str]]:
    """Read Markdown or a saved GitHub-style JSON issue record."""
    raw = path.read_text(encoding="utf-8")
    if path.suffix.casefold() != ".json":
        return raw, set()

    payload = json.loads(raw)
    if isinstance(payload, str):
        return payload, set()
    issue = payload.get("issue", payload) if isinstance(payload, dict) else {}
    body = issue.get("body", "") if isinstance(issue, dict) else ""
    labels = issue.get("labels", []) if isinstance(issue, dict) else []
    return str(body or ""), {_label_name(label) for label in labels if _label_name(label)}


def section_bodies(body: str) -> dict[str, str]:
    headings = list(HEADING_RE.finditer(body))
    sections: dict[str, str] = {}
    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(body)
        name = _normalise_heading(heading.group(1))
        sections[name] = sections.get(name, "") + body[heading.end() : end]
    return sections


def lint_issue(body: str, labels: set[str], contract: dict[str, Any]) -> list[str]:
    issue_contract = contract["issue"]
    required_sections = issue_contract["required_sections"]
    sections = section_bodies(body)
    errors = [
        f"missing required section: {section}"
        for section in required_sections
        if _normalise_heading(section) not in sections
    ]

    acceptance_name = _normalise_heading("Acceptance Criteria")
    if issue_contract["acceptance_criteria"].get("require_checkboxes", False):
        acceptance_body = sections.get(acceptance_name, "")
        if not CHECKBOX_RE.search(acceptance_body):
            errors.append("Acceptance Criteria must contain at least one checkbox")

    ready_label = contract["labels"]["ready"]
    stop_labels = set(contract["labels"]["stop"])
    conflicting_stop_labels = sorted(labels & stop_labels)
    if ready_label in labels and conflicting_stop_labels:
        errors.append(
            f"{ready_label} cannot be combined with: {', '.join(conflicting_stop_labels)}"
        )
    return errors


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("body_file", nargs="?", type=Path, help="Markdown body or saved issue JSON")
    parser.add_argument("--issue-file", type=Path, help="Markdown body or saved issue JSON")
    parser.add_argument("--contract", type=Path, default=DEFAULT_CONTRACT)
    parser.add_argument("--label", action="append", default=[], help="Issue label; repeat or comma-separate")
    parser.add_argument("--labels", action="append", default=[], help="Issue labels; repeat or comma-separate")
    parser.add_argument("--json", action="store_true", dest="as_json", help="Print a JSON result")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.body_file and args.issue_file:
        build_parser().error("use either body_file or --issue-file, not both")
    issue_file = args.issue_file or args.body_file
    if not issue_file:
        build_parser().error("an issue file is required")
    body, saved_labels = load_issue(issue_file)
    contract = json.loads(args.contract.read_text(encoding="utf-8"))
    labels = saved_labels | parse_labels(args.label + args.labels)
    errors = lint_issue(body, labels, contract)
    result = {"valid": not errors, "errors": errors, "labels": sorted(labels)}

    if args.as_json:
        print(json.dumps(result, indent=2, sort_keys=True))
    elif errors:
        print("INVALID")
        for error in errors:
            print(f"- {error}")
    else:
        print("VALID")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
