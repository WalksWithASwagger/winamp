#!/usr/bin/env python3
"""Report the read-only agentic status of open issues and pull requests."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


CATEGORIES = ("ready", "blocked", "needs-human", "review-ready", "unclassified")


def _label_name(label: Any) -> str:
    if isinstance(label, str):
        return label.strip()
    if isinstance(label, dict):
        return str(label.get("name", "")).strip()
    return ""


def labels_for(item: dict[str, Any]) -> set[str]:
    return {_label_name(label) for label in item.get("labels", []) if _label_name(label)}


def load_fixture(path: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return [item for item in payload if item.get("kind") == "issue"], [
            item for item in payload if item.get("kind") in {"pr", "pull_request"}
        ]
    return payload.get("issues", []), payload.get("pull_requests", payload.get("prs", []))


def load_records(path: Path, key: str) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    return payload.get(key, [])


def gh_json(command: list[str]) -> list[dict[str, Any]]:
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def load_github(repo: str | None, limit: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    common = ["--state", "open", "--limit", str(limit)]
    if repo:
        common += ["--repo", repo]
    issues = gh_json(["gh", "issue", "list", *common, "--json", "number,title,body,labels,url"])
    pulls = gh_json(
        [
            "gh",
            "pr",
            "list",
            *common,
            "--json",
            "number,title,body,labels,url,isDraft,headRefName,baseRefName",
        ]
    )
    return issues, pulls


def classify(item: dict[str, Any], kind: str, contract: dict[str, Any]) -> tuple[str, str]:
    labels = labels_for(item)
    stop_labels = set(contract["labels"]["stop"])
    if "blocked" in labels:
        return "blocked", "blocked label"
    if labels & (stop_labels - {"blocked"}):
        return "needs-human", "human decision or intervention label"
    if (
        kind == "pull request"
        and not bool(item.get("isDraft", item.get("draft", False)))
        and contract["labels"].get("review_ready", "review-ready") in labels
    ):
        return "review-ready", "review-ready label"
    if kind == "issue" and contract["labels"]["ready"] in labels:
        return "ready", "agent:ready label"
    return "unclassified", f"open {kind} has no agentic status label"


def summarise(item: dict[str, Any], kind: str, category: str, reason: str) -> dict[str, Any]:
    summary = {
        "kind": kind,
        "number": item.get("number"),
        "title": item.get("title", ""),
        "url": item.get("url"),
        "labels": sorted(labels_for(item)),
        "category": category,
        "reason": reason,
    }
    if kind == "pull request":
        summary.update(
            {
                "draft": bool(item.get("isDraft", item.get("draft", False))),
                "head": item.get("headRefName"),
                "base": item.get("baseRefName"),
            }
        )
    return summary


def build_report(
    issues: list[dict[str, Any]], pulls: list[dict[str, Any]], contract: dict[str, Any]
) -> dict[str, Any]:
    categories = {category: [] for category in CATEGORIES}
    for kind, items in (("issue", issues), ("pull request", pulls)):
        for item in items:
            category, reason = classify(item, kind, contract)
            categories[category].append(summarise(item, kind, category, reason))
    counts = {category: len(items) for category, items in categories.items()}
    return {"counts": counts, "categories": categories}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--offline", "--input", dest="offline", type=Path, help="JSON fixture")
    source.add_argument("--repo", help="GitHub repository passed to read-only gh list calls")
    parser.add_argument("--issues-file", type=Path, help="Offline JSON issue records")
    parser.add_argument("--prs-file", type=Path, help="Offline JSON pull request records")
    parser.add_argument("--contract", type=Path, default=Path(__file__).resolve().parents[2] / "agentic" / "contract.json")
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--format", choices=("json", "text"), default="json")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    contract = json.loads(args.contract.read_text(encoding="utf-8"))
    if args.offline and (args.issues_file or args.prs_file):
        build_parser().error("use --offline or --issues-file/--prs-file, not both")
    if args.issues_file or args.prs_file:
        issues = load_records(args.issues_file, "issues") if args.issues_file else []
        pulls = load_records(args.prs_file, "pull_requests") if args.prs_file else []
        source = "offline:separate-files"
    elif args.offline:
        issues, pulls = load_fixture(args.offline)
        source = f"offline:{args.offline}"
    else:
        issues, pulls = load_github(args.repo, args.limit)
        source = "github:open"

    report = build_report(issues, pulls, contract)
    report["source"] = source
    if args.format == "json":
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print(f"source: {source}")
        for category in CATEGORIES:
            print(f"{category}: {report['counts'][category]}")
            for item in report["categories"][category]:
                print(f"  #{item['number']} [{item['kind']}] {item['title']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
