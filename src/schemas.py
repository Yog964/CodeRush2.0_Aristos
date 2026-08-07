from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class MemoryLayer(str, Enum):
    WORKING = "Working"
    TASK = "Task"
    PROJECT = "Project"
    STRATEGY = "Strategy"
    EPISODIC = "Episodic"
    USER_PREFERENCE = "UserPreference"
    VERIFIED_EVIDENCE = "VerifiedEvidence"

class MemoryStatus(str, Enum):
    CREATED = "Created"
    VERIFIED = "Verified"
    ACTIVE = "Active"
    STALE = "Stale"
    REVOKED = "Revoked"
    ARCHIVED = "Archived"

class EventType(str, Enum):
    INFO = "INFO"
    ERROR = "ERROR"
    WARNING = "WARNING"
    TOOL_CALL = "TOOL_CALL"
    LLM_CALL = "LLM_CALL"
    RECOVERY = "RECOVERY"
    VERIFICATION_RESULT = "VERIFICATION_RESULT"
    LAYER_START = "LAYER_START"
    LAYER_END = "LAYER_END"

class LLMResponse(BaseModel):
    content: str = ""
    model: str = ""
    total_duration_ns: int = 0
    prompt_eval_count: int = 0
    eval_count: int = 0
    success: bool = True
    error: Optional[str] = None

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
    layer: str = Field(..., description="Memory layer")
    content: str = Field(..., description="The content of the memory")
    source_provenance: str = Field(..., description="Source of the memory (e.g., file path, task id)")
    confidence_score: float = Field(..., description="Confidence score from 0.0 to 1.0")
    invalidation_rules: str = Field(..., description="Rules for when this memory becomes stale")
    status: str = Field(default=MemoryStatus.CREATED.value)
    timestamp: str = Field(default="")
    commit_hash: str = Field(default="")
    creator: str = Field(default="system")
    ekg_links: List[str] = Field(default_factory=list)

class ToolCallRequest(BaseModel):
    action: str = Field(..., description="Tool action (e.g., read_file, write_file, run_command, complete)")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Parameters for the tool")

class ToolCallResult(BaseModel):
    success: bool
    output: str
    error: str = ""
    duration_ms: float = 0.0

class InitialRequest(BaseModel):
    repository_path: str = Field(..., description="Path to the repository to ingest")
    issue_statement: str = Field(..., description="User issue statement or request")

class FileInfo(BaseModel):
    path: str
    language: str
    line_count: int
    size_bytes: int = 0
    last_modified: str = ""

class SymbolInfo(BaseModel):
    file_path: str
    kind: str 
    name: str
    line_start: int = 0
    line_end: int = 0
    docstring: str = ""
    decorators: List[str] = Field(default_factory=list)

class ImportInfo(BaseModel):
    source_file: str
    imported_module: str
    imported_names: List[str] = Field(default_factory=list)
    is_relative: bool = False

class CallInfo(BaseModel):
    caller_file: str
    caller_function: str
    callee_function: str
    line_number: int

class TestMapping(BaseModel):
    test_file: str
    test_function: str
    source_imports: List[str] = Field(default_factory=list)

class RepoIntelligenceReport(BaseModel):
    total_files: int = 0
    total_lines: int = 0
    languages: Dict[str, int] = Field(default_factory=dict)
    files: List[FileInfo] = Field(default_factory=list)
    symbols: List[SymbolInfo] = Field(default_factory=list)
    imports: List[ImportInfo] = Field(default_factory=list)
    calls: List[CallInfo] = Field(default_factory=list)
    test_mappings: List[TestMapping] = Field(default_factory=list)

class RepositoryDNA(BaseModel):
    architecture_pattern: str = "Unknown"
    frameworks: List[str] = Field(default_factory=list)
    risk_modules: List[str] = Field(default_factory=list)
    hot_files: List[str] = Field(default_factory=list)
    coding_conventions: List[str] = Field(default_factory=list)

class VerificationResult(BaseModel):
    check_name: str
    passed: bool
    details: str

class ConfidenceReport(BaseModel):
    overall_score: float = 0.0
    factors: Dict[str, float] = Field(default_factory=dict)
    explanation: str = ""

class EvidencePackage(BaseModel):
    task_graph_versions: List[Dict[str, Any]] = Field(default_factory=list)
    tool_calls: List[ToolCallResult] = Field(default_factory=list)
    files_modified: List[str] = Field(default_factory=list)
    verification_results: List[VerificationResult] = Field(default_factory=list)
    confidence: ConfidenceReport = Field(default_factory=ConfidenceReport)

class EventLog(BaseModel):
    timestamp: str
    layer: str
    component: str
    event_type: str
    message: str
    data: Optional[Dict[str, Any]] = None

class ExecutionTrace(BaseModel):
    start_time: str
    end_time: str = ""
    events: List[EventLog] = Field(default_factory=list)
    llm_calls: int = 0
    total_tokens: int = 0
    layers_completed: List[str] = Field(default_factory=list)
