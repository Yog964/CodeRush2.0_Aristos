// Architecture workflow data — each layer has ordered steps with I/O connections

export interface StepPort {
  label: string;     // what data flows through this port
  type: 'input' | 'output';
}

export interface WorkflowStep {
  id: string;
  label: string;          // action name
  description: string;    // what happens
  details: string[];      // bullet-point breakdown
  file?: string;
  inputs: string[];       // data entering this step
  outputs: string[];      // data leaving this step
  status?: 'idle' | 'running' | 'done' | 'error';
}

export interface ArchLayer {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  icon: string;
  description: string;
  steps: WorkflowStep[];
}

export const ARCHITECTURE_DATA: ArchLayer[] = [
  {
    id: 'layer-user',
    label: 'User Input',
    shortLabel: 'Input',
    color: '#64748b',
    gradientFrom: '#475569',
    gradientTo: '#334155',
    icon: '👤',
    description: 'Entry point — user supplies a repository and issue statement.',
    steps: [
      {
        id: 'step-user-input',
        label: 'Submit Issue Request',
        description: 'User provides the repository URL and a natural language issue or feature request.',
        details: ['Repo URL / local path', 'Free-text issue statement', 'Optional model override (defaults to llama3.2:latest)'],
        inputs: [],
        outputs: ['repo_path: str', 'issue_statement: str'],
      },
    ],
  },
  {
    id: 'layer-0',
    label: 'Layer 0 – Model Adapter',
    shortLabel: 'L0: Adapter',
    color: '#6366f1',
    gradientFrom: '#4f46e5',
    gradientTo: '#4338ca',
    icon: '🔌',
    description: 'Normalizes all LLM requests and responses. Handles retries, schema enforcement, and fallback.',
    steps: [
      {
        id: 'step-health-check',
        label: 'Health Check',
        description: 'Pings Ollama API to confirm model is available before any generation.',
        details: ['GET /api/tags', 'Verifies requested model exists', 'Raises clear error if Ollama is offline'],
        inputs: ['model_name: str'],
        outputs: ['model_available: bool'],
        file: 'src/layer_0_adapter/ollama_adapter.py',
      },
      {
        id: 'step-request-normalize',
        label: 'Request Normalization',
        description: 'Converts harness-internal prompt format into Ollama REST API payload.',
        details: ['Constructs JSON body for /api/generate or /api/chat', 'Injects format: "json" for structured calls', 'Appends Pydantic schema to prompt for structured outputs'],
        inputs: ['prompt: str', 'system_prompt: str', 'schema: Type[T]'],
        outputs: ['ollama_payload: dict'],
        file: 'src/layer_0_adapter/ollama_adapter.py',
      },
      {
        id: 'step-llm-generate',
        label: 'LLM Generation (Ollama)',
        description: 'Posts request to local Ollama server and streams the response.',
        details: ['POST http://localhost:11434/api/generate', 'Configurable timeout (120s default)', 'Token and call count tracking'],
        inputs: ['ollama_payload: dict'],
        outputs: ['raw_response: str', 'tokens_used: int'],
        file: 'src/layer_0_adapter/ollama_adapter.py',
      },
      {
        id: 'step-response-normalize',
        label: 'Response Normalization + Retry',
        description: 'Parses raw LLM output into a validated Pydantic model. Retries up to 3 times with exponential backoff.',
        details: ['JSON parse + Pydantic validation', '3 retry attempts on parse failure', 'Smart fallback: single Explorer node for TaskGraph, "complete" action for ToolCallRequest', 'Error classification: ConnectionError / 404 / Timeout / Malformed'],
        inputs: ['raw_response: str', 'schema: Type[T]'],
        outputs: ['parsed_object: T'],
        file: 'src/layer_0_adapter/ollama_adapter.py',
      },
    ],
  },
  {
    id: 'layer-a',
    label: 'Layer A – Perception',
    shortLabel: 'LA: Perception',
    color: '#0ea5e9',
    gradientFrom: '#0284c7',
    gradientTo: '#0369a1',
    icon: '🔍',
    description: 'Reads and understands the entire repository through static analysis, AST parsing, and a knowledge graph.',
    steps: [
      {
        id: 'step-repo-scan',
        label: 'Repository Scan',
        description: 'Recursively walks the repository directory tree, detecting file types and counting lines.',
        details: ['Skips .git, __pycache__, node_modules, .env', 'Language detection by extension (.py, .js, .ts, .java, .go...)', 'Builds FileInfo list with path, language, line count'],
        inputs: ['repo_path: str'],
        outputs: ['file_map: List[FileInfo]'],
        file: 'src/layer_a_perception/repo_intelligence.py',
      },
      {
        id: 'step-ast-index',
        label: 'AST Index Build',
        description: 'Parses every Python file with the ast module to extract classes, functions, and decorators.',
        details: ['ClassDef, FunctionDef, AsyncFunctionDef extraction', 'Line numbers and docstrings captured', 'Decorator lists recorded'],
        inputs: ['file_map: List[FileInfo]'],
        outputs: ['symbol_index: List[SymbolInfo]'],
        file: 'src/layer_a_perception/repo_intelligence.py',
      },
      {
        id: 'step-import-call-graph',
        label: 'Import & Call Graph',
        description: 'Traces module dependencies and direct function call relationships.',
        details: ['Import, ImportFrom AST nodes → import graph', 'Call AST nodes → call graph (caller, callee, line)', 'Relative import detection'],
        inputs: ['file_map: List[FileInfo]'],
        outputs: ['import_graph: List[ImportInfo]', 'call_graph: List[CallInfo]'],
        file: 'src/layer_a_perception/repo_intelligence.py',
      },
      {
        id: 'step-repo-dna',
        label: 'Repo DNA Analysis',
        description: 'Detects architecture patterns, frameworks, and identifies high-risk, high-churn files.',
        details: ['Pattern detection: MVC, Layered, Hexagonal', 'Framework detection via requirements.txt / package.json', 'Risk modules: git log commit count per file', 'Hot files: most recently modified'],
        inputs: ['file_map: List[FileInfo]', 'repo_path: str'],
        outputs: ['repo_dna: RepositoryDNA'],
        file: 'src/layer_a_perception/repo_dna.py',
      },
      {
        id: 'step-ekg-build',
        label: 'Build Engineering Knowledge Graph',
        description: 'Constructs a NetworkX directed graph with File, Class, Function, and Test nodes connected by edges.',
        details: ['Nodes: File, Class, Function, Test', 'Edges: contains / imports / calls / tests', 'BFS impact analysis per file', 'Serializable subgraphs for LLM context'],
        inputs: ['repo_intelligence: RepoIntelligenceReport'],
        outputs: ['ekg: EngineeringKnowledgeGraph'],
        file: 'src/layer_a_perception/ekg.py',
      },
      {
        id: 'step-context-build',
        label: 'Context Assembly',
        description: 'Builds an optimized prompt context within token budget, scoring relevance of each code entity to the issue.',
        details: ['Token budget: 4000 tokens (~16k chars)', 'Keyword overlap relevance scoring', 'Issue + file structure + EKG entities + memory', 'Truncates least-relevant items first'],
        inputs: ['issue: str', 'repo_intelligence: RepoIntelligenceReport', 'ekg: EKG', 'memory_context: str'],
        outputs: ['context_string: str'],
        file: 'src/layer_a_perception/context_manager.py',
      },
    ],
  },
  {
    id: 'layer-b',
    label: 'Layer B – Cognitive Intelligence',
    shortLabel: 'LB: Cognition',
    color: '#8b5cf6',
    gradientFrom: '#7c3aed',
    gradientTo: '#6d28d9',
    icon: '🧠',
    description: 'Plans, orchestrates, and executes tasks via LLM-powered agents with a 7-tier memory system.',
    steps: [
      {
        id: 'step-memory-load',
        label: 'Load Memory Context',
        description: 'Queries the 7-tier SQLite memory store for relevant past knowledge to inject into the planning prompt.',
        details: ['7 tiers: Working, Task, Project, Strategy, Episodic, UserPreference, VerifiedEvidence', 'Filtered by confidence score', 'Lifecycle: Created → Verified → Active → Stale → Archived'],
        inputs: ['issue: str'],
        outputs: ['memory_context: str'],
        file: 'src/layer_b_cognitive/memory_manager.py',
      },
      {
        id: 'step-plan',
        label: 'Parliamentary Planning',
        description: 'LLM generates a dependency-aware TaskGraph (DAG) with persona-assigned nodes.',
        details: ['Checks Strategy memory for reusable plan', 'LLM generates TaskGraph via generate_structured()', 'Personas: Explorer, Implementer, Reviewer, Verifier', 'Nodes include dependencies forming a DAG'],
        inputs: ['issue: str', 'context: str', 'memory_context: str'],
        outputs: ['task_graph: TaskGraph'],
        file: 'src/layer_b_cognitive/parliamentary_planner.py',
      },
      {
        id: 'step-agent-execute',
        label: 'Agent Pool Execution',
        description: 'Each TaskNode is executed by the matching persona agent in a ReAct-style tool loop.',
        details: ['Explorer: reads, searches, lists files', 'Implementer: writes and modifies files', 'Reviewer: reviews code quality', 'Verifier: runs test commands', 'Tool loop runs up to MAX_AGENT_ACTIONS'],
        inputs: ['task_graph: TaskGraph', 'context: str'],
        outputs: ['agent_outputs: List[str]', 'tool_call_log: List[ToolCallResult]'],
        file: 'src/layer_b_cognitive/agent_pool.py',
      },
      {
        id: 'step-memory-store',
        label: 'Store to Memory',
        description: 'Saves task outcomes, patterns, and verified evidence back to the memory store for future reuse.',
        details: ['Task results → Task Memory', 'Successful patterns → Strategy Memory', 'Verified facts → VerifiedEvidence tier', 'File-linked memories marked Stale on change'],
        inputs: ['agent_outputs: List[str]', 'task_graph: TaskGraph'],
        outputs: ['memory_updated: bool'],
        file: 'src/layer_b_cognitive/memory_manager.py',
      },
    ],
  },
  {
    id: 'layer-c',
    label: 'Layer C – Action',
    shortLabel: 'LC: Action',
    color: '#f59e0b',
    gradientFrom: '#d97706',
    gradientTo: '#b45309',
    icon: '⚡',
    description: 'Safely executes all tool calls in an isolated sandbox environment.',
    steps: [
      {
        id: 'step-tool-dispatch',
        label: 'Tool Dispatch',
        description: 'The ToolEngine receives a ToolCallRequest from an agent and routes it to the correct sandbox method.',
        details: ['read_file, write_file, run_command', 'list_directory, search_text', 'git_diff, git_log', 'complete (task termination signal)', 'Flexible key matching (filepath / file_path / path)'],
        inputs: ['tool_call: ToolCallRequest'],
        outputs: ['tool_result: ToolCallResult'],
        file: 'src/layer_c_action/tool_engine.py',
      },
      {
        id: 'step-sandbox-exec',
        label: 'Sandbox Execution',
        description: 'The SandboxExecutor runs the action inside an isolated environment (Docker or local subprocess fallback).',
        details: ['Docker: python:3.10-slim with repo mounted as volume', 'Local fallback: subprocess.run with cwd=repo_path', 'encoding="utf-8", errors="replace" to prevent Windows charmap crashes', 'Timeout enforced per command'],
        inputs: ['action: str', 'parameters: dict', 'repo_path: str'],
        outputs: ['exit_code: int', 'stdout: str', 'stderr: str'],
        file: 'src/layer_c_action/sandbox.py',
      },
      {
        id: 'step-result-return',
        label: 'Result Return & Logging',
        description: 'Formats the sandbox output into a ToolCallResult and emits an event to the EventLogger.',
        details: ['success=True/False based on exit_code', 'output=stdout+stderr truncated as needed', 'EventLogger.log_tool_call() invoked', 'WebSocket broadcast to frontend'],
        inputs: ['exit_code: int', 'stdout: str', 'stderr: str'],
        outputs: ['tool_result: ToolCallResult', 'event_logged: bool'],
        file: 'src/layer_c_action/tool_engine.py',
      },
    ],
  },
  {
    id: 'layer-d',
    label: 'Layer D – Validation',
    shortLabel: 'LD: Validation',
    color: '#10b981',
    gradientFrom: '#059669',
    gradientTo: '#047857',
    icon: '✅',
    description: 'Verifies all code changes through automated checks and produces a scored evidence package.',
    steps: [
      {
        id: 'step-syntax-lint',
        label: 'Syntax & Lint Check',
        description: 'Runs py_compile and flake8 on all modified Python files.',
        details: ['py_compile.compile() → SyntaxError detection', 'flake8 for PEP8 violations', 'Results stored per-file', 'Failures recorded in evidence'],
        inputs: ['modified_files: List[str]'],
        outputs: ['syntax_ok: bool', 'lint_issues: List[str]'],
        file: 'src/layer_d_validation/verification_engine.py',
      },
      {
        id: 'step-test-run',
        label: 'Test Suite Execution',
        description: 'Runs pytest against the repository test suite to verify no regressions were introduced.',
        details: ['pytest --tb=short invoked via sandbox', 'Pass/fail status captured', 'Test output stored in evidence', 'Missing test suite = neutral score (not failure)'],
        inputs: ['repo_path: str'],
        outputs: ['tests_passed: bool', 'test_output: str'],
        file: 'src/layer_d_validation/verification_engine.py',
      },
      {
        id: 'step-security-diff',
        label: 'Security & Diff Check',
        description: 'Scans for leaked secrets and validates that git diff is non-empty.',
        details: ['Pattern matching: API keys, passwords, tokens', 'git diff output checked for minimum size', 'Empty diff = no code change warning', 'Secret pattern match = automatic failure'],
        inputs: ['modified_files: List[str]', 'diff: str'],
        outputs: ['security_ok: bool', 'diff_valid: bool'],
        file: 'src/layer_d_validation/verification_engine.py',
      },
      {
        id: 'step-score',
        label: 'Confidence Scoring',
        description: 'Computes a weighted confidence score (0.0–1.0) from all verification factors.',
        details: ['Syntax factor: weight 1.0', 'Lint factor: weight 0.5', 'Test factor: weight 0.5', 'Security factor: weight 1.0', 'Plan quality + minimal changes bonus'],
        inputs: ['verification_results: VerificationResults'],
        outputs: ['confidence_score: float', 'score_breakdown: dict'],
        file: 'src/layer_d_validation/confidence_scorer.py',
      },
      {
        id: 'step-package',
        label: 'Evidence Package Export',
        description: 'Writes the final patch, execution trace, and evidence JSON to the output directory.',
        details: ['changes.patch — git diff output', 'evidence_package.json — full tool call log + verification results', 'execution_trace.json — timestamps + token counts', 'Confidence score included in report'],
        inputs: ['diff: str', 'evidence: dict', 'trace: dict', 'score: float'],
        outputs: ['output/changes.patch', 'output/evidence_package.json', 'output/execution_trace.json'],
        file: 'src/layer_d_validation/evidence_collector.py',
      },
    ],
  },
];

export const EVENT_TO_STEP: Record<string, string> = {
  'RepoIntelligence': 'step-repo-scan',
  'ASTIndex': 'step-ast-index',
  'ImportGraph': 'step-import-call-graph',
  'RepoDNA': 'step-repo-dna',
  'EKG': 'step-ekg-build',
  'ContextManager': 'step-context-build',
  'MemoryManager': 'step-memory-load',
  'ParliamentaryPlanner': 'step-plan',
  'AgentPool': 'step-agent-execute',
  'ToolEngine': 'step-tool-dispatch',
  'SandboxExecutor': 'step-sandbox-exec',
  'VerificationEngine': 'step-syntax-lint',
  'ConfidenceScorer': 'step-score',
  'EvidenceCollector': 'step-package',
  'OllamaAdapter': 'step-llm-generate',
};

const LAYER_W = 820;
const STEP_W  = 720;
const STEP_H  = 72;
const STEP_GAP = 52;          // vertical space between steps (for edge arrows)
const LAYER_HEADER_H = 64;
const LAYER_PADDING_X = 50;
const LAYER_PADDING_TOP = 72;
const LAYER_PADDING_BOTTOM = 24;
const LAYER_GAP = 40;

export function getLayerHeight(layer: ArchLayer, expanded: boolean): number {
  if (!expanded) return LAYER_HEADER_H;
  const steps = layer.steps.length;
  return LAYER_PADDING_TOP + steps * STEP_H + (steps - 1) * STEP_GAP + LAYER_PADDING_BOTTOM;
}

export function buildGraphData(
  expandedLayers: Set<string>,
  selectedId: string | null,
  activeStepId: string | null = null,
): { nodes: any[]; edges: any[] } {
  const nodes: any[] = [];
  const edges: any[] = [];
  let currentY = 0;

  ARCHITECTURE_DATA.forEach((layer, layerIdx) => {
    const isExpanded = expandedLayers.has(layer.id);
    const layerH = getLayerHeight(layer, isExpanded);
    const isLayerSelected = selectedId === layer.id;

    // ── Layer node ──────────────────────────────────────────────
    nodes.push({
      id: layer.id,
      type: 'layerNode',
      position: { x: 0, y: currentY },
      data: {
        ...layer,
        isExpanded,
        isSelected: isLayerSelected,
      },
      style: { width: LAYER_W, height: layerH },
    });

    // ── Step nodes (children) ────────────────────────────────────
    if (isExpanded) {
      layer.steps.forEach((step, stepIdx) => {
        const isStepSelected = selectedId === step.id;
        const isActive = activeStepId === step.id;
        const stepY = LAYER_PADDING_TOP + stepIdx * (STEP_H + STEP_GAP);
        const stepX = LAYER_PADDING_X;

        nodes.push({
          id: step.id,
          type: 'stepNode',
          position: { x: stepX, y: stepY },
          parentId: layer.id,
          extent: 'parent' as const,
          data: {
            ...step,
            layerColor: layer.color,
            isSelected: isStepSelected,
            isActive,
            stepIndex: stepIdx,
            totalSteps: layer.steps.length,
          },
          style: { width: STEP_W, height: STEP_H },
        });

        // Vertical flow edges between consecutive steps
        if (stepIdx < layer.steps.length - 1) {
          const nextStep = layer.steps[stepIdx + 1];
          edges.push({
            id: `e-flow-${step.id}-${nextStep.id}`,
            source: step.id,
            target: nextStep.id,
            type: 'smoothstep',
            animated: isActive || activeStepId === nextStep.id,
            label: step.outputs[0] || '',
            labelStyle: {
              fill: '#94a3b8',
              fontSize: 10,
              fontFamily: "'Fira Code', monospace",
            },
            labelBgStyle: { fill: 'rgba(15,23,42,0.85)', rx: 4 },
            style: {
              stroke: isActive || isStepSelected
                ? layer.color
                : 'rgba(255,255,255,0.2)',
              strokeWidth: isActive || isStepSelected ? 2.5 : 1.5,
            },
          });
        }
      });
    }

    // ── Inter-layer edge ────────────────────────────────────────
    if (layerIdx > 0) {
      const prevLayer = ARCHITECTURE_DATA[layerIdx - 1];
      const prevLastStep = prevLayer.steps[prevLayer.steps.length - 1];
      const edgeLabel = prevLastStep?.outputs[0] || '';

      edges.push({
        id: `e-layer-${prevLayer.id}-${layer.id}`,
        source: prevLayer.id,
        target: layer.id,
        type: 'smoothstep',
        animated: activeStepId != null && prevLayer.steps.some(s => s.id === activeStepId),
        label: edgeLabel,
        labelStyle: { fill: '#94a3b8', fontSize: 10 },
        labelBgStyle: { fill: 'rgba(15,23,42,0.85)', rx: 4 },
        style: {
          stroke: (selectedId === prevLayer.id || selectedId === layer.id)
            ? layer.color
            : 'rgba(255,255,255,0.3)',
          strokeWidth: 2,
        },
      });
    }

    currentY += layerH + LAYER_GAP;
  });

  return { nodes, edges };
}
