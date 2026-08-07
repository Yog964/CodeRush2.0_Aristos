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

# In-memory queues for connected websocket clients
# Key: run_id, Value: list of asyncio.Queue
ws_queues: Dict[str, list[asyncio.Queue]] = {}

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
    
    # We create a custom logger for this run
    logger = get_event_logger_for_run(run_id)

    # Run the harness in a background task
    def background_task():
        try:
            # Pass run_id to the orchestrator so it can isolate files
            orchestrator = Orchestrator(repo_path=req.repo_path, issue_statement=req.issue, logger=logger, run_id=run_id)
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
    except WebSocketDisconnect:
        ws_queues[run_id].remove(q)
