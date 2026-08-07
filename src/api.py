import asyncio
import uuid
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict

from src.orchestrator import Orchestrator
from src.layer_0_observability.event_logger import EventLogger

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RunRequest(BaseModel):
    repo_path: str
    issue: str
    is_baseline: bool = False
    comparison_group_id: str = None

# In-memory queues for connected websocket clients
# Key: run_id, Value: list of asyncio.Queue
ws_queues: Dict[str, list[asyncio.Queue]] = {}

# Metadata for each run (issue, repo name) so dashboard can display them
run_registry: Dict[str, dict] = {}

def get_event_logger_for_run(run_id: str) -> EventLogger:
    logger = EventLogger()
    # Capture the current running event loop so the background thread can schedule callbacks
    loop = asyncio.get_running_loop()
    
    def cb(event):
        event_dict = event.model_dump()
        if run_id in ws_queues:
            for q in ws_queues[run_id]:
                # Thread-safe queue push
                loop.call_soon_threadsafe(q.put_nowait, event_dict)
                
    logger.register_callback(cb)
    return logger

@app.post("/api/runs")
async def start_run(req: RunRequest):
    run_id = f"RUN-{str(uuid.uuid4())[:8].upper()}"
    ws_queues[run_id] = []
    # Register metadata so the dashboard can show issue/repo for active runs
    run_registry[run_id] = {
        "issue": req.issue, 
        "repo": req.repo_path.rstrip('/').split('/')[-1],
        "is_baseline": req.is_baseline,
        "comparison_group_id": req.comparison_group_id
    }
    
    # We create a custom logger for this run
    logger = get_event_logger_for_run(run_id)

    # Run the harness in a background task
    def background_task():
        try:
            repo_path = req.repo_path
            
            # If it's a remote URL, clone it first
            if repo_path.startswith("http://") or repo_path.startswith("https://"):
                repo_name = repo_path.rstrip('/').split('/')[-1]
                if repo_name.endswith('.git'):
                    repo_name = repo_name[:-4]
                    
                import os
                current_drive = os.path.splitdrive(os.getcwd())[0]
                if not current_drive:
                    current_drive = "D:"
                    
                base_dir = os.path.join(current_drive + os.sep, "CodeRush", "cloned repos")
                os.makedirs(base_dir, exist_ok=True)
                target_dir = os.path.join(base_dir, repo_name)
                
                logger.log("Init", "System", "INFO", f"Cloning repository {repo_path} into {target_dir}...")
                
                import subprocess
                if not os.path.exists(target_dir):
                    subprocess.run(["git", "clone", repo_path, target_dir], check=True)
                    logger.log("Init", "System", "INFO", f"Cloned successfully.")
                else:
                    logger.log("Init", "System", "INFO", f"Directory {target_dir} already exists. Using existing repository.")
                
                repo_path = target_dir

            # Pass run_id to the orchestrator so it can isolate files
            orchestrator = Orchestrator(
                repo_path=repo_path, 
                issue_statement=req.issue, 
                logger=logger, 
                run_id=run_id,
                is_baseline=req.is_baseline,
                comparison_group_id=req.comparison_group_id
            )
            orchestrator.run()
        except Exception as e:
            logger.log_error("System", str(e))
    
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, background_task)

    return {"run_id": run_id}

@app.websocket("/ws/events/{run_id}")
async def websocket_endpoint(websocket: WebSocket, run_id: str):
    await websocket.accept()
    if run_id not in ws_queues:
        ws_queues[run_id] = []
    
    q = asyncio.Queue()
    ws_queues[run_id].append(q)
    
    try:
        while True:
            event = await q.get()
            await websocket.send_json(event)
    except Exception:
        pass
    finally:
        if run_id in ws_queues and q in ws_queues[run_id]:
            ws_queues[run_id].remove(q)


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str):
    """Return full evidence and trace data for a completed run."""
    import os
    base = os.path.join(os.path.splitdrive(os.getcwd())[0] + os.sep, "CodeRush", "outputs", run_id)
    result = {
        "run_id": run_id,
        "evidence": None,
        "trace": None,
        "metadata": None,
    }
    evidence_path = os.path.join(base, "evidence_package.json")
    trace_path = os.path.join(base, "execution_trace.json")
    metadata_path = os.path.join(base, "metadata.json")
    if os.path.exists(evidence_path):
        try:
            with open(evidence_path) as f:
                result["evidence"] = json.load(f)
        except Exception:
            pass
    if os.path.exists(trace_path):
        try:
            with open(trace_path) as f:
                result["trace"] = json.load(f)
        except Exception:
            pass
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path) as f:
                result["metadata"] = json.load(f)
        except Exception:
            pass
    return result


@app.get("/api/dashboard")
async def get_dashboard():
    """Return live dashboard stats from the outputs folder."""
    import os
    import glob

    base = os.path.join(os.path.splitdrive(os.getcwd())[0] + os.sep, "CodeRush", "outputs")
    runs = []

    if os.path.isdir(base):
        for run_dir in sorted(os.listdir(base), reverse=True):
            run_path = os.path.join(base, run_dir)
            evidence_path = os.path.join(run_path, "evidence_package.json")
            trace_path = os.path.join(run_path, "execution_trace.json")
            metadata_path = os.path.join(run_path, "metadata.json")

            run_entry = {
                "run_id": run_dir,
                "status": "Unknown",
                "issue": run_registry.get(run_dir, {}).get("issue", ""),
                "repo": run_registry.get(run_dir, {}).get("repo", ""),
                "is_baseline": run_registry.get(run_dir, {}).get("is_baseline", False),
                "comparison_group_id": run_registry.get(run_dir, {}).get("comparison_group_id", None),
                "started_at": "",
                "duration": "",
                "files_changed": 0,
                "tokens": 0,
                "confidence": 0.0,
                "verification": []
            }
            
            if os.path.exists(metadata_path):
                try:
                    with open(metadata_path) as f:
                        meta = json.load(f)
                    if not run_entry["issue"]: run_entry["issue"] = meta.get("issue", "")
                    if not run_entry["repo"]: run_entry["repo"] = meta.get("repo", "")
                    run_entry["is_baseline"] = meta.get("is_baseline", False)
                    if "comparison_group_id" in meta:
                        run_entry["comparison_group_id"] = meta.get("comparison_group_id")
                except Exception:
                    pass

            if os.path.exists(trace_path):
                try:
                    with open(trace_path) as f:
                        trace = json.load(f)
                    run_entry["started_at"] = trace.get("start_time", "")
                    run_entry["end_time"] = trace.get("end_time", "")
                    run_entry["tokens"] = trace.get("total_tokens", 0)
                    if run_entry["started_at"] and run_entry["end_time"]:
                        from datetime import datetime
                        try:
                            s = datetime.fromisoformat(run_entry["started_at"])
                            e = datetime.fromisoformat(run_entry["end_time"])
                            run_entry["duration"] = f"{(e - s).seconds}s"
                        except Exception:
                            pass
                except Exception:
                    pass

            if os.path.exists(evidence_path):
                try:
                    with open(evidence_path) as f:
                        evidence = json.load(f)
                    run_entry["files_changed"] = len(evidence.get("files_modified", []))
                    run_entry["confidence"] = evidence.get("confidence", {}).get("overall_score", 0.0)
                    verifications = evidence.get("verification_results", [])
                    run_entry["verification"] = verifications
                    all_pass = all(v.get("passed", False) for v in verifications)
                    any_fail = any(not v.get("passed", False) for v in verifications)
                    diff_fail = next((v for v in verifications if v.get("check_name") == "diff"), None)
                    if diff_fail and not diff_fail.get("passed"):
                        run_entry["status"] = "No Changes"
                    elif all_pass:
                        run_entry["status"] = "Success"
                    elif any_fail:
                        run_entry["status"] = "Partial"
                    else:
                        run_entry["status"] = "Unknown"
                except Exception:
                    pass

            runs.append(run_entry)

    # Compute aggregate stats
    total_runs = len(runs)
    successful = [r for r in runs if r["status"] == "Success"]
    pass_rate = round((len(successful) / total_runs * 100) if total_runs > 0 else 0, 1)
    total_tokens = sum(r["tokens"] for r in runs)
    repos = len(set(r["repo"] for r in runs if r["repo"]))

    # Active run = run in ws_queues that isn't in the outputs folder yet
    # (still running)
    active_run = None
    for rid, queues in ws_queues.items():
        if len(queues) > 0:
            active_run = {
                "run_id": rid,
                "issue": run_registry.get(rid, {}).get("issue", ""),
                "repo": run_registry.get(rid, {}).get("repo", ""),
            }
            break

    return {
        "stats": {
            "total_runs": total_runs,
            "pass_rate": pass_rate,
            "total_tokens": total_tokens,
            "repos": repos,
        },
        "recent_runs": runs[:10],
        "active_run": active_run,
    }
