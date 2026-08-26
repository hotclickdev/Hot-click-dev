import json
import time
from pathlib import Path

log_path = Path(r"c:\Cursor-test-hot\Hot-click-dev\debug-7c1239.log")
ci_path = Path(r"c:\Cursor-test-hot\Hot-click-dev\.github\workflows\ci.yml")
pkg_path = Path(r"c:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\package.json")
text = ci_path.read_text(encoding="utf-8")
pkg = json.loads(pkg_path.read_text(encoding="utf-8"))


def log(hypothesis_id, location, message, data):
    entry = {
        "sessionId": "7c1239",
        "runId": "post-node22-fix",
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    with log_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=True) + "\n")
    print(hypothesis_id, message, json.dumps(data, ensure_ascii=True)[:300])


log(
    "A",
    "github:job/95367474705",
    "frontend_annotation",
    {
        "pnpm_requires": ">=22.13",
        "ci_had": "20.20.2",
        "error": "ERR_UNKNOWN_BUILTIN_MODULE node:sqlite",
        "status": "CONFIRMED",
    },
)
log(
    "A",
    "ci.yml:frontend",
    "workflow_node_version",
    {
        "has_node_20": "node-version: '20'" in text,
        "has_node_22": "node-version: '22'" in text,
        "step_name_22": "Setup Node 22" in text,
        "package_engines": pkg.get("engines"),
        "package_manager": pkg.get("packageManager"),
    },
)
log(
    "B",
    "github:job/95367474775",
    "java_job_status",
    {
        "conclusion": "failure",
        "failed_step": "Run tests",
        "duration": "3m 9s",
        "annotation": "Process completed with exit code 1",
        "status": "INCONCLUSIVE_until_local_mvn",
    },
)
