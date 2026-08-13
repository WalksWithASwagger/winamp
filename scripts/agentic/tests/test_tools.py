from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
FIXTURES = Path(__file__).parent / "fixtures"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


issue_lint = load_module("issue_lint", ROOT / "scripts/agentic/issue_lint.py")
status_report = load_module("status_report", ROOT / "scripts/agentic/status_report.py")
CONTRACT = json.loads((ROOT / "agentic/contract.json").read_text(encoding="utf-8"))


class IssueLintTests(unittest.TestCase):
    def test_valid_issue_body_passes(self):
        body = (FIXTURES / "valid_issue.md").read_text(encoding="utf-8")
        self.assertEqual(issue_lint.lint_issue(body, {"agent:ready"}, CONTRACT), [])

    def test_saved_json_issue_record_passes(self):
        body, labels = issue_lint.load_issue(FIXTURES / "valid_issue.json")
        self.assertEqual(issue_lint.lint_issue(body, labels, CONTRACT), [])

    def test_exact_issue_file_cli_passes(self):
        result = subprocess.run(
            [
                sys.executable,
                str(ROOT / "scripts/agentic/issue_lint.py"),
                "--issue-file",
                str(FIXTURES / "valid_issue.md"),
                "--labels",
                "agent:ready",
            ],
            check=True,
            capture_output=True,
            text=True,
            cwd=ROOT,
        )
        self.assertEqual(result.stdout.strip(), "VALID")

    def test_missing_sections_are_rejected(self):
        body = (FIXTURES / "missing_sections.md").read_text(encoding="utf-8")
        errors = issue_lint.lint_issue(body, set(), CONTRACT)
        self.assertIn("missing required section: Tests/Evals", errors)
        self.assertIn("missing required section: Out of Scope", errors)
        self.assertIn("Acceptance Criteria must contain at least one checkbox", errors)

    def test_missing_acceptance_checkboxes_are_rejected(self):
        body = (FIXTURES / "missing_acceptance_checkboxes.md").read_text(encoding="utf-8")
        errors = issue_lint.lint_issue(body, set(), CONTRACT)
        self.assertEqual(errors, ["Acceptance Criteria must contain at least one checkbox"])

    def test_ready_and_stop_labels_are_rejected(self):
        body = (FIXTURES / "valid_issue.md").read_text(encoding="utf-8")
        errors = issue_lint.lint_issue(body, {"agent:ready", "needs-human"}, CONTRACT)
        self.assertEqual(errors, ["agent:ready cannot be combined with: needs-human"])


class StatusReportTests(unittest.TestCase):
    def test_offline_fixture_classifies_each_status(self):
        issues, pulls = status_report.load_fixture(FIXTURES / "status.json")
        report = status_report.build_report(issues, pulls, CONTRACT)
        self.assertEqual(report["counts"], {
            "ready": 1,
            "blocked": 1,
            "needs-human": 1,
            "review-ready": 1,
            "unclassified": 1,
        })
        self.assertEqual(report["categories"]["needs-human"][0]["number"], 103)
        self.assertEqual(report["categories"]["review-ready"][0]["number"], 201)
        self.assertEqual(report["categories"]["unclassified"][0]["number"], 202)

    def test_status_cli_is_offline_and_read_only(self):
        command = [
            sys.executable,
            str(ROOT / "scripts/agentic/status_report.py"),
            "--offline",
            str(FIXTURES / "status.json"),
        ]
        result = subprocess.run(command, check=True, capture_output=True, text=True, cwd=ROOT)
        report = json.loads(result.stdout)
        self.assertEqual(report["source"], f"offline:{FIXTURES / 'status.json'}")
        self.assertEqual(report["counts"]["ready"], 1)

    def test_exact_separate_files_cli_is_offline_and_read_only(self):
        command = [
            sys.executable,
            str(ROOT / "scripts/agentic/status_report.py"),
            "--issues-file",
            str(FIXTURES / "issues.json"),
            "--prs-file",
            str(FIXTURES / "prs.json"),
        ]
        result = subprocess.run(command, check=True, capture_output=True, text=True, cwd=ROOT)
        report = json.loads(result.stdout)
        self.assertEqual(report["source"], "offline:separate-files")
        self.assertEqual(report["counts"]["ready"], 1)
        self.assertEqual(report["counts"]["review-ready"], 1)


if __name__ == "__main__":
    unittest.main()
