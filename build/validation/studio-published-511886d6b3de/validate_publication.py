"""Validate a frozen release with the previously used independent contracts."""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

release = Path(sys.argv[1])
audit = Path(sys.argv[2])
repository = Path(sys.argv[3])
results = release / "checks"
results.mkdir()
metadata = json.loads((release / "candidate.json").read_text())
assert metadata["manifest"] == "511886d6b3de"
assert metadata["modules"]["libref_gles3compat.wasm"] == (
    "f440e4a16db8083f0ce61451f73d50ed33fa84a5e6a5efa47ae2d90ea3696500"
)

browser_root = Path("/root/cof-audits/browser-1.64.1")
(results / "node_modules").symlink_to(browser_root / "node_modules")
shutil.copy2(audit / "tools/e2e/studio_runtime_contract.mjs", results)
shutil.copy2(repository / "tools/e2e/extras_interactions.mjs", results)
node = "/root/emsdk/node/24.19.0_64bit/bin/node"
env = dict(os.environ, PLAYWRIGHT_BROWSERS_PATH=str(browser_root / "browsers"))
origin = "http://127.0.0.1:8168/"
runtime = [
    node, str(results / "studio_runtime_contract.mjs"), origin,
]
checks = [
    ("numeric", [sys.executable, "-B", str(audit / "tools/e2e/studio_numeric_contract.py"),
                 str(release / "source"), str(results / "numeric")], env),
    ("chromium", runtime + [str(results / "chromium"), str(release / "candidate.json")], env),
    ("extras", [node, str(results / "extras_interactions.mjs"), origin, str(results / "extras")], env),
    ("firefox", ["xvfb-run", "-a", "-s", "-screen 0 1280x900x24", *runtime,
                 str(results / "firefox"), str(release / "candidate.json"), "firefox"],
     dict(env, LIBGL_ALWAYS_SOFTWARE="1", COF_AUDIT_DRAWS="0")),
]

summary = {}
with (results / "http.log").open("w") as http:
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", "8168", "--bind", "127.0.0.1",
         "--directory", str(release / "candidate")], stdout=http, stderr=http
    )
    try:
        for name, command, check_env in checks:
            print(f"Running {name}", flush=True)
            with (results / f"{name}.log").open("w") as log:
                completed = subprocess.run(["timeout", "180", *command], env=check_env,
                                           stdout=log, stderr=subprocess.STDOUT)
            row = {"exitCode": completed.returncode}
            detail = results / name / "result.json"
            if detail.exists():
                parsed = json.loads(detail.read_text())
                for key in ("passed", "failure", "errors", "modules", "draws", "browser", "chromium"):
                    if key in parsed:
                        row[key] = parsed[key]
                if "modules" in parsed:
                    assert all(metadata["modules"][key] == value for key, value in parsed["modules"].items())
            summary[name] = row
            (results / "summary.json").write_text(json.dumps(summary, indent=2))
            print(f"{name}: exit {completed.returncode}", flush=True)
    finally:
        server.terminate()
        server.wait(timeout=10)
