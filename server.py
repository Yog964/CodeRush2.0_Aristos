from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import os
import json

from src.orchestrator import Orchestrator

app = FastAPI(title="AE-01 Harness API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

class RunRequest(BaseModel):
    repo_path: str
    issue_statement: str
    model: str = "llama3.2:latest"

# Keep track of active orchestrator
active_orchestrator = None

@app.post("/api/run")
async def start_run(request: RunRequest):
    global active_orchestrator
    
    # We run the orchestrator in a background thread to avoid blocking FastAPI
    def run_harness():
        global active_orchestrator
        active_orchestrator = Orchestrator(
            repo_path=request.repo_path,
            issue_statement=request.issue_statement,
            model=request.model
        )
        
        # Attach our websocket broadcast callback
        def ws_callback(event):
            # Push to the asyncio event loop
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                # If there's no running loop in the thread, create a quick coroutine
                asyncio.run(manager.broadcast(event.model_dump()))
                return
                
            asyncio.run_coroutine_threadsafe(
                manager.broadcast(event.model_dump()), 
                loop
            )

        active_orchestrator.logger.register_callback(ws_callback)
        active_orchestrator.run()

    # Start the task without blocking
    asyncio.get_running_loop().run_in_executor(None, run_harness)
    
    return {"status": "started", "repo_path": request.repo_path}

@app.websocket("/ws/events")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We don't expect messages from client, but we must keep connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
