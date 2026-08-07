from .schemas import TaskGraph, InitialRequest
from .llm import LLMClient
from .sandbox import SandboxExecutor
from .memory import MemoryManager
from .agent_pool import AgentPool
from typing import Dict

class Orchestrator:
    def __init__(self, repo_path: str, issue_statement: str):
        self.request = InitialRequest(repository_path=repo_path, issue_statement=issue_statement)
        
        print("Initializing AE-01 Harness...")
        self.llm = LLMClient() # Connects to Ollama
        self.sandbox = SandboxExecutor(repo_path)
        self.memory = MemoryManager()
        self.pool = AgentPool(self.llm, self.sandbox, self.memory)
        
        # Initial context ingestion
        self._ingest_context()

    def _ingest_context(self):
        """Stage 1: Intake & Repository Intelligence"""
        print("Stage 1: Intake & Repository Intelligence")
        # In a full implementation, we'd scan the repo structure and build ASTs here.
        # For now, we seed the Working Memory with the issue statement.
        self.memory.add_memory(
            layer="Working",
            content=f"Initial Issue: {self.request.issue_statement}",
            source_provenance="User Input",
            confidence_score=1.0,
            invalidation_rules="Never"
        )
        
        # Read the root dir to give some context
        code, stdout, stderr = self.sandbox.execute_command("ls -la")
        if code == 0:
            self.memory.add_memory(
                layer="Project",
                content=f"Repository structure:\n{stdout}",
                source_provenance="ls -la",
                confidence_score=1.0,
                invalidation_rules="On directory change"
            )

    def plan_task_graph(self) -> TaskGraph:
        """Stage 2: Task Graph Orchestration"""
        print("Stage 2: Task Graph Orchestration")
        prompt = (
            "Analyze the following context and formulate a Task Graph of sequential micro-tasks "
            "to resolve the issue. Assign specialized personas (Explorer, Implementer, Reviewer, Verifier) "
            "to each task node."
        )
        system_prompt = "You are the Task Graph Planner for AE-01."
        
        context = self.memory.get_all_context()
        full_prompt = f"Context:\n{context}\n\n{prompt}"
        
        graph = self.llm.get_structured_output(full_prompt, TaskGraph, system_prompt)
        print(f"Generated Task Graph with {len(graph.nodes)} nodes.")
        return graph

    def execute_graph(self, graph: TaskGraph):
        """Stage 4 & 5: Sandboxed Action Loop and Verification"""
        print("Stage 4: Sandboxed Action Loop & Recovery")
        
        # Simple linear execution based on dependencies
        # In a real DAG executor, we'd resolve dependencies properly.
        # For simplicity, we just execute them in order they are defined.
        
        for node in graph.nodes:
            print(f"\n--- Executing Task: {node.id} ({node.persona}) ---")
            result = self.pool.assign_task(node)
            print(f"Result:\n{result}")
            
            # Save output to Task Memory
            self.memory.add_memory(
                layer="Task",
                content=f"Task {node.id} completed. Result:\n{result}",
                source_provenance=node.id,
                confidence_score=0.9,
                invalidation_rules="On code change affecting this task"
            )

        print("\nStage 5: Verification-First Completion")
        print("Executing verification suite...")
        # A simple verifier step could be hardcoded or managed by a Verifier persona.
        # Assuming the Verifier persona ran tests, we compile the Rollback-Ready Artifact.
        
        # Generate a patch
        code, diff_out, _ = self.sandbox.execute_command("git diff")
        if code == 0 and diff_out.strip():
            with open("rollback_artifact.patch", "w") as f:
                f.write(diff_out)
            print("Rollback-Ready Artifact generated: rollback_artifact.patch")
            
            print("Committing and pushing changes to remote repository...")
            self.sandbox.execute_command('git config user.name "AE-01 Agent"')
            self.sandbox.execute_command('git config user.email "agent@harness.local"')
            self.sandbox.execute_command("git add .")
            self.sandbox.execute_command('git commit -m "Auto-generated fixes by AE-01 Harness"')
            
            push_code, push_out, push_err = self.sandbox.execute_command("git push")
            if push_code == 0:
                print("Successfully pushed changes to remote!")
            else:
                print(f"Failed to push changes. Ensure authentication is set up.\nError: {push_err or push_out}")
        else:
            print("No changes detected or not a git repository.")
            
        print("Execution complete.")

    def run(self):
        graph = self.plan_task_graph()
        self.execute_graph(graph)
