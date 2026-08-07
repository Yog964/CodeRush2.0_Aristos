"""
Unified Agentic Coding Harness – Main Orchestrator
Coordinates all 4 layers: Perception → Cognition → Action → Validation
"""
import os
import time
import json
from typing import Optional

from config import Config
from src.schemas import (
    InitialRequest, TaskGraph, ToolCallResult,
    EventType, MemoryLayer
)
from src.layer_0_adapter.ollama_adapter import OllamaAdapter
from src.layer_a_perception.repo_intelligence import RepoIntelligenceEngine
from src.layer_a_perception.repo_dna import RepoDNAAnalyzer
from src.layer_a_perception.ekg import EngineeringKnowledgeGraph
from src.layer_a_perception.context_manager import ContextManager
from src.layer_b_cognitive.memory_manager import MemoryManager
from src.layer_b_cognitive.parliamentary_planner import ParliamentaryPlanner
from src.layer_b_cognitive.agent_pool import AgentPool
from src.layer_c_action.sandbox import SandboxExecutor
from src.layer_c_action.tool_engine import ToolEngine
from src.layer_d_validation.verification_engine import VerificationEngine
from src.layer_d_validation.evidence_collector import EvidenceCollector
from src.layer_d_validation.confidence_scorer import ConfidenceScorer
from src.layer_0_observability.event_logger import EventLogger
from src.layer_0_observability.trace_collector import TraceCollector


class Orchestrator:
    """
    Main pipeline coordinator for the Unified Agentic Coding Harness.
    Wires all 4 layers together and runs the complete workflow.
    """

    def __init__(self, repo_path: str, issue_statement: str,
                 model: str = None, ollama_url: str = None,
                 auto_push: bool = None, logger: Optional[EventLogger] = None, run_id: str = "run_default"):
        self.request = InitialRequest(
            repository_path=repo_path,
            issue_statement=issue_statement
        )
        self.repo_path = os.path.abspath(repo_path)
        self.run_id = run_id
        self.used_fallback_plan = False

        # Override config if CLI args provided
        if model:
            Config.OLLAMA_MODEL = model
        if ollama_url:
            Config.OLLAMA_BASE_URL = ollama_url
        if auto_push is not None:
            Config.AUTO_PUSH = auto_push

        # ── Cross-cutting: Observability ──
        self.logger = logger if logger else EventLogger()
        self.trace = TraceCollector()

        # ── Layer 0: Model Adapter ──
        self.llm = OllamaAdapter()

        # ── Layer B components (need early init for memory) ──
        self.memory = MemoryManager()

        # ── Layer C: Action ──
        self.sandbox = SandboxExecutor(self.repo_path)
        self.tool_engine = ToolEngine(self.sandbox, self.logger)

        # ── Layer B: Cognitive ──
        self.planner = ParliamentaryPlanner(self.llm, self.memory)
        self.agent_pool = AgentPool(self.llm, self.tool_engine, self.memory)

        # ── Layer D: Validation ──
        self.verifier = VerificationEngine(self.sandbox)
        self.evidence = EvidenceCollector()
        self.scorer = ConfidenceScorer()

        # ── Layer A components (initialized in run) ──
        self.intelligence_report = None
        self.repo_dna = None
        self.ekg = None
        self.context_manager = ContextManager(Config.CONTEXT_TOKEN_BUDGET)

        # Output directory (isolated by run_id)
        # Use absolute path outside the user repo to avoid dirtying their git index, 
        # or just a dedicated outputs folder in the CodeRush workspace
        workspace_root = os.path.splitdrive(os.getcwd())[0] + os.sep + os.path.join("CodeRush", "outputs")
        self.output_dir = os.path.join(workspace_root, self.run_id)
        os.makedirs(self.output_dir, exist_ok=True)

    def run(self):
        """Execute the complete 4-layer pipeline."""
        total_start = time.time()

        self.logger.log_layer_start("HARNESS INITIALIZATION")
        self.logger.log("Init", "Orchestrator", EventType.INFO.value,
                        f"Repository: {self.repo_path}")
        self.logger.log("Init", "Orchestrator", EventType.INFO.value,
                        f"Issue: {self.request.issue_statement}")
        self.logger.log("Init", "Orchestrator", EventType.INFO.value,
                        f"Model: {Config.OLLAMA_MODEL}")

        # Check LLM health
        if not self.llm.check_health():
            self.logger.log_error("Orchestrator",
                                  f"Ollama not reachable at {Config.OLLAMA_BASE_URL}. "
                                  "Please ensure Ollama is running.")
            return

        # ═══════════════════════════════════════════════════════
        # LAYER A – PERCEPTION
        # ═══════════════════════════════════════════════════════
        layer_a_start = time.time()
        self.logger.log_layer_start("Layer A – Perception")

        try:
            self._run_layer_a()
        except Exception as e:
            self.logger.log_error("Layer A", f"Perception failed: {e}")

        layer_a_duration = time.time() - layer_a_start
        self.logger.log_layer_end("Layer A – Perception", layer_a_duration)
        self.trace.record_layer_complete("Layer A")

        # ═══════════════════════════════════════════════════════
        # LAYER B – COGNITIVE INTELLIGENCE
        # ═══════════════════════════════════════════════════════
        layer_b_start = time.time()
        self.logger.log_layer_start("Layer B – Cognitive Intelligence")

        task_graph = None
        try:
            task_graph = self._run_layer_b()
        except Exception as e:
            self.logger.log_error("Layer B", f"Cognition failed: {e}")

        layer_b_duration = time.time() - layer_b_start
        self.logger.log_layer_end("Layer B – Cognitive Intelligence", layer_b_duration)
        self.trace.record_layer_complete("Layer B")

        if not task_graph or not task_graph.nodes:
            self.logger.log_error("Orchestrator", "Planner returned empty graph. Using deterministic fallback.")
            from src.layer_b_cognitive.parliamentary_planner import _make_fallback_graph
            task_graph = _make_fallback_graph(self.request.issue_statement)

        # ═══════════════════════════════════════════════════════
        # LAYER C – ACTION
        # ═══════════════════════════════════════════════════════
        layer_c_start = time.time()
        self.logger.log_layer_start("Layer C – Action")

        try:
            self._run_layer_c(task_graph)
        except Exception as e:
            self.logger.log_error("Layer C", f"Action failed: {e}")

        layer_c_duration = time.time() - layer_c_start
        self.logger.log_layer_end("Layer C – Action", layer_c_duration)
        self.trace.record_layer_complete("Layer C")

        # ═══════════════════════════════════════════════════════
        # LAYER D – VALIDATION
        # ═══════════════════════════════════════════════════════
        layer_d_start = time.time()
        self.logger.log_layer_start("Layer D – Validation")

        try:
            self._run_layer_d()
        except Exception as e:
            self.logger.log_error("Layer D", f"Validation failed: {e}")

        layer_d_duration = time.time() - layer_d_start
        self.logger.log_layer_end("Layer D – Validation", layer_d_duration)
        self.trace.record_layer_complete("Layer D")

        # ═══════════════════════════════════════════════════════
        # FINAL OUTPUT
        # ═══════════════════════════════════════════════════════
        total_duration = time.time() - total_start
        self._generate_final_output(total_duration)

    def _run_layer_a(self):
        """Layer A: Perception – Understand the repository."""
        # 1. Repository Intelligence
        self.logger.log("Layer A", "RepoIntelligence", EventType.INFO.value,
                        "Scanning repository structure...")
        engine = RepoIntelligenceEngine(self.repo_path)
        self.intelligence_report = engine.scan()

        self.logger.log("Layer A", "RepoIntelligence", EventType.INFO.value,
                        f"Found {self.intelligence_report.total_files} files, "
                        f"{len(self.intelligence_report.symbols)} symbols, "
                        f"{self.intelligence_report.total_lines} lines")

        # Store in Project Memory
        self.memory.add_memory(
            layer=MemoryLayer.PROJECT.value,
            content=f"Repository has {self.intelligence_report.total_files} files, "
                    f"{len(self.intelligence_report.symbols)} symbols, "
                    f"Languages: {self.intelligence_report.languages}",
            source_provenance="RepoIntelligenceEngine",
            confidence_score=1.0,
            invalidation_rules="On directory change"
        )

        # 2. Repository DNA
        self.logger.log("Layer A", "RepoDNA", EventType.INFO.value,
                        "Analyzing repository DNA...")
        dna_analyzer = RepoDNAAnalyzer(self.repo_path, self.intelligence_report)
        self.repo_dna = dna_analyzer.analyze()

        self.logger.log("Layer A", "RepoDNA", EventType.INFO.value,
                        f"Architecture: {self.repo_dna.architecture_pattern}, "
                        f"Frameworks: {self.repo_dna.frameworks}")

        self.memory.add_memory(
            layer=MemoryLayer.PROJECT.value,
            content=f"Architecture: {self.repo_dna.architecture_pattern}, "
                    f"Frameworks: {self.repo_dna.frameworks}, "
                    f"Conventions: {self.repo_dna.coding_conventions}",
            source_provenance="RepoDNAAnalyzer",
            confidence_score=0.9,
            invalidation_rules="On major structural change"
        )

        # 3. Engineering Knowledge Graph
        self.logger.log("Layer A", "EKG", EventType.INFO.value,
                        "Building Engineering Knowledge Graph...")
        self.ekg = EngineeringKnowledgeGraph()
        self.ekg.build_from_intelligence(self.intelligence_report)

        self.logger.log("Layer A", "EKG", EventType.INFO.value,
                        self.ekg.summary())

        # 4. Store issue in Working Memory
        self.memory.add_memory(
            layer=MemoryLayer.WORKING.value,
            content=f"Issue: {self.request.issue_statement}",
            source_provenance="User Input",
            confidence_score=1.0,
            invalidation_rules="Never"
        )

    def _run_layer_b(self) -> Optional[TaskGraph]:
        """Layer B: Cognitive Intelligence – Plan the solution."""
        # 1. Build context
        self.logger.log("Layer B", "ContextManager", EventType.INFO.value,
                        "Building optimal context...")

        memory_context = self.memory.get_context_for_task(
            self.request.issue_statement
        )

        context = self.context_manager.build_context(
            issue=self.request.issue_statement,
            intelligence=self.intelligence_report,
            ekg=self.ekg,
            memory_context=memory_context
        )

        token_estimate = self.context_manager.estimate_tokens(context)
        self.logger.log("Layer B", "ContextManager", EventType.INFO.value,
                        f"Context built: ~{token_estimate} tokens")

        # 2. Parliamentary Planner
        self.logger.log("Layer B", "Planner", EventType.INFO.value,
                        "Generating task graph via Parliamentary Planner...")

        task_graph = self.planner.plan(
            issue=self.request.issue_statement,
            context=context
        )

        # Check if we got a fallback plan
        if (len(task_graph.nodes) == 1 and
                task_graph.nodes[0].id.startswith("mock_")):
            self.used_fallback_plan = True
            self.logger.log("Layer B", "Planner", EventType.RECOVERY.value,
                            "Using fallback task graph (LLM did not respond properly)")

        self.evidence.add_plan_version(task_graph)

        self.logger.log("Layer B", "Planner", EventType.INFO.value,
                        f"Task Graph: {len(task_graph.nodes)} tasks")
        for node in task_graph.nodes:
            self.logger.log("Layer B", "Planner", EventType.INFO.value,
                            f"  -> [{node.persona}] {node.id}: {node.description}")

        # Store plan in Task Memory
        self.memory.add_memory(
            layer=MemoryLayer.TASK.value,
            content=f"Task Graph with {len(task_graph.nodes)} nodes: "
                    + ", ".join(n.id for n in task_graph.nodes),
            source_provenance="ParliamentaryPlanner",
            confidence_score=0.9 if not self.used_fallback_plan else 0.3,
            invalidation_rules="On replan"
        )

        return task_graph

    def _run_layer_c(self, task_graph: TaskGraph):
        """Layer C: Action – Execute the task graph."""
        # Take a snapshot for rollback
        snapshot_msg = self.sandbox.snapshot()
        self.logger.log("Layer C", "Sandbox", EventType.INFO.value,
                        f"Snapshot: {snapshot_msg}")

        # Build execution context
        memory_context = self.memory.get_context_for_task(
            self.request.issue_statement
        )
        context = self.context_manager.build_context(
            issue=self.request.issue_statement,
            intelligence=self.intelligence_report,
            ekg=self.ekg,
            memory_context=memory_context
        )

        # Execute each task node
        for i, node in enumerate(task_graph.nodes):
            self.logger.log("Layer C", "AgentPool", EventType.INFO.value,
                            f"Executing task {i+1}/{len(task_graph.nodes)}: "
                            f"[{node.persona}] {node.description}")

            try:
                result = self.agent_pool.execute_task(node, context)

                self.logger.log("Layer C", node.persona, EventType.INFO.value,
                                f"Result: {result[:200]}..." if len(result) > 200 else f"Result: {result}")

                # Store result in Task Memory
                self.memory.add_memory(
                    layer=MemoryLayer.TASK.value,
                    content=f"Task {node.id} completed: {result[:500]}",
                    source_provenance=node.id,
                    confidence_score=0.8,
                    invalidation_rules="On code change"
                )

            except Exception as e:
                self.logger.log_error(node.persona, f"Task {node.id} failed: {e}")

                # Attempt replan
                self.logger.log("Layer C", "Planner", EventType.RECOVERY.value,
                                "Attempting dynamic replan...")
                try:
                    new_graph = self.planner.replan(
                        task_graph, str(e), context
                    )
                    self.evidence.add_plan_version(new_graph)
                    # Continue with remaining tasks from new graph
                    for new_node in new_graph.nodes:
                        if new_node.id not in [n.id for n in task_graph.nodes[:i+1]]:
                            new_result = self.agent_pool.execute_task(
                                new_node, context)
                            self.logger.log("Layer C", new_node.persona,
                                            EventType.INFO.value,
                                            f"Replan result: {new_result[:200]}")
                    break
                except Exception as replan_error:
                    self.logger.log_error("Planner",
                                          f"Replan also failed: {replan_error}")
                    break

        # Track modified files
        diff = self.sandbox.get_diff()
        if diff.strip():
            # Parse diff for file names
            for line in diff.split('\n'):
                if line.startswith('diff --git'):
                    parts = line.split(' b/')
                    if len(parts) > 1:
                        self.evidence.add_file_modified(parts[-1])

    def _run_layer_d(self):
        """Layer D: Validation – Verify everything."""
        # 1. Run verification suite
        self.logger.log("Layer D", "Verification", EventType.INFO.value,
                        "Running verification suite...")

        results = self.verifier.run_full_verification()

        for result in results:
            status = "PASS" if result.passed else "FAIL"
            self.logger.log("Layer D", "Verification",
                            EventType.VERIFICATION_RESULT.value,
                            f"{result.check_name}: {status} – {result.details}")
            self.evidence.add_verification(result)

        # 2. Calculate confidence
        self.logger.log("Layer D", "Confidence", EventType.INFO.value,
                        "Calculating confidence score...")

        confidence = self.scorer.calculate(
            verification_results=results,
            used_fallback_plan=self.used_fallback_plan,
            files_modified_count=len(self.evidence.files_modified)
        )

        self.evidence.set_confidence(confidence)

        self.logger.log("Layer D", "Confidence", EventType.INFO.value,
                        f"Overall Confidence: {confidence.overall_score:.2f}")
        self.logger.log("Layer D", "Confidence", EventType.INFO.value,
                        f"Factors: {confidence.factors}")

    def _generate_final_output(self, total_duration: float):
        """Generate the final output package."""
        self.logger.log_layer_start("FINAL OUTPUT")

        # 1. Generate patch
        diff = self.sandbox.get_diff()
        if diff.strip():
            patch_path = os.path.join(self.output_dir, "changes.patch")
            try:
                with open(patch_path, 'w', encoding='utf-8') as f:
                    f.write(diff)
                self.logger.log("Output", "Patch", EventType.INFO.value,
                                f"Patch saved: {patch_path}")
                # Log a special event so the UI can render the files changed
                self.logger.log("Output", "Git", "DIFF", "Files Changed", data={"diff": diff})
            except Exception as e:
                self.logger.log_error("Output", f"Failed to save patch: {e}")

            # Auto-commit if configured
            if Config.AUTO_PUSH:
                self._auto_commit_and_push()
        else:
            self.logger.log("Output", "Patch", EventType.INFO.value,
                            "No code changes were made.")

        # 2. Save evidence package
        try:
            self.evidence.save_to_file(self.output_dir)
            self.logger.log("Output", "Evidence", EventType.INFO.value,
                            f"Evidence package saved to {self.output_dir}")
        except Exception as e:
            self.logger.log_error("Output", f"Failed to save evidence: {e}")

        # 3. Save execution trace
        self.trace.record_llm_call(self.llm.total_tokens_used)
        trace = self.trace.finalize()
        try:
            self.trace.save_to_file(self.output_dir)
            self.logger.log("Output", "Trace", EventType.INFO.value,
                            f"Execution trace saved to {self.output_dir}")
        except Exception as e:
            self.logger.log_error("Output", f"Failed to save trace: {e}")

        # 4. Store in Verified Evidence Memory
        evidence_pkg = self.evidence.build_package()
        self.memory.add_memory(
            layer=MemoryLayer.VERIFIED_EVIDENCE.value,
            content=f"Execution completed. Confidence: {evidence_pkg.confidence.overall_score:.2f}. "
                    f"Files modified: {len(evidence_pkg.files_modified)}. "
                    f"LLM calls: {self.llm.total_calls}.",
            source_provenance="Orchestrator",
            confidence_score=evidence_pkg.confidence.overall_score,
            invalidation_rules="Never"
        )

        # 5. Store successful strategy in Strategy Memory
        if evidence_pkg.confidence.overall_score >= 0.5 and not self.used_fallback_plan:
            if evidence_pkg.task_graph_versions:
                self.memory.add_memory(
                    layer=MemoryLayer.STRATEGY.value,
                    content=f"Successful strategy for issue type: "
                            f"{self.request.issue_statement[:100]}. "
                            f"Task graph: {json.dumps(evidence_pkg.task_graph_versions[-1])}",
                    source_provenance="Orchestrator",
                    confidence_score=evidence_pkg.confidence.overall_score,
                    invalidation_rules="On strategy update"
                )

        # Print summary
        self.logger.log_layer_start("EXECUTION SUMMARY")
        self.logger.log("Summary", "Orchestrator", EventType.INFO.value,
                        f"Total duration: {total_duration:.1f}s")
        self.logger.log("Summary", "Orchestrator", EventType.INFO.value,
                        f"LLM calls: {self.llm.total_calls}")
        self.logger.log("Summary", "Orchestrator", EventType.INFO.value,
                        f"Total tokens: {self.llm.total_tokens_used}")
        self.logger.log("Summary", "Orchestrator", EventType.INFO.value,
                        f"Files modified: {len(evidence_pkg.files_modified)}")
        self.logger.log("Summary", "Orchestrator", EventType.INFO.value,
                        f"Confidence: {evidence_pkg.confidence.overall_score:.2f}")

    def _auto_commit_and_push(self):
        """Auto-commit and push changes to remote."""
        self.logger.log("Output", "Git", EventType.INFO.value,
                        "Auto-committing and pushing changes...")
        self.sandbox.execute_command(
            f'git config user.name "{Config.GIT_USER_NAME}"')
        self.sandbox.execute_command(
            f'git config user.email "{Config.GIT_USER_EMAIL}"')
        self.sandbox.execute_command("git add .")

        commit_msg = (f"fix: {self.request.issue_statement[:50]} "
                      f"[AE-01 Harness]")
        code, stdout, stderr = self.sandbox.execute_command(
            f'git commit -m "{commit_msg}"')
        if code == 0:
            self.logger.log("Output", "Git", EventType.INFO.value,
                            "Changes committed.")
            push_code, push_out, push_err = self.sandbox.execute_command(
                "git push")
            if push_code == 0:
                self.logger.log("Output", "Git", EventType.INFO.value,
                                "Pushed to remote successfully!")
            else:
                self.logger.log_error("Git",
                                      f"Push failed: {push_err or push_out}")
        else:
            self.logger.log_error("Git",
                                  f"Commit failed: {stderr or stdout}")
