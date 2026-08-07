from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class TaskNode(BaseModel):
    id: str = Field(..., description="Unique identifier for the task node")
    persona: str = Field(..., description="Persona assigned to this task (e.g., Explorer, Implementer, Reviewer, Verifier)")
    description: str = Field(..., description="Description of the task to be performed")
    dependencies: List[str] = Field(default_factory=list, description="List of task IDs that must be completed before this task")
    token_budget: int = Field(default=2000, description="Token budget allocated for this task")

class TaskGraph(BaseModel):
    action: str = Field(default="plan_task_graph", description="Action type")
    nodes: List[TaskNode] = Field(..., description="List of task nodes forming the DAG")

class MemoryItem(BaseModel):
    id: str = Field(..., description="Unique identifier for the memory item")
    layer: str = Field(..., description="Memory layer (Working, Task, Project, Episodic)")
    content: str = Field(..., description="The content of the memory")
    source_provenance: str = Field(..., description="Source of the memory (e.g., file path, task id)")
    confidence_score: float = Field(..., description="Confidence score from 0.0 to 1.0")
    invalidation_rules: str = Field(..., description="Rules for when this memory becomes stale")

class ToolCallRequest(BaseModel):
    action: str = Field(..., description="Tool action (e.g., read_file, run_command)")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Parameters for the tool")

class InitialRequest(BaseModel):
    repository_path: str = Field(..., description="Path to the repository to ingest")
    issue_statement: str = Field(..., description="User issue statement or request")
