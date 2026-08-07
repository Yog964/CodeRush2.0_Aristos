import json
import time
from typing import Optional
from src.schemas import TaskGraph, TaskNode, MemoryLayer
from src.layer_b_cognitive.memory_manager import MemoryManager

# Fallback plan used when LLM cannot generate a valid plan
def _make_fallback_graph(issue: str) -> TaskGraph:
    return TaskGraph(nodes=[
        TaskNode(
            id="explore-1",
            persona="Explorer",
            description=f"Explore the repository structure and understand the codebase relevant to: {issue}",
            dependencies=[],
            token_budget=2000
        ),
        TaskNode(
            id="implement-1",
            persona="Implementer",
            description=f"Implement the required changes to solve: {issue}. Write all necessary files.",
            dependencies=["explore-1"],
            token_budget=3000
        ),
        TaskNode(
            id="verify-1",
            persona="Verifier",
            description="Run tests and verify that the implemented changes work correctly.",
            dependencies=["implement-1"],
            token_budget=1000
        )
    ])


class ParliamentaryPlanner:
    """Planner that generates task graphs using parliamentary personas."""

    MAX_RETRIES = 3
    TIMEOUT_SECONDS = 20

    def __init__(self, llm_adapter, memory_manager: Optional[MemoryManager] = None):
        self.llm_adapter = llm_adapter
        self.memory_manager = memory_manager or MemoryManager()

    def plan(self, issue: str, context: str) -> TaskGraph:
        """Create a plan for the issue with timeout and retry logic."""
        strategies = self.memory_manager.get_by_layer(MemoryLayer.STRATEGY.value)
        reusable_strategy = None

        issue_lower = issue.lower()
        for strategy in strategies:
            strategy_words = set(strategy.content.lower().split())
            issue_words = set(issue_lower.split())
            if len(strategy_words.intersection(issue_words)) > 2:
                reusable_strategy = strategy
                break

        # Build a concise, unambiguous prompt
        if reusable_strategy:
            base_prompt = (
                f"You are a software engineering planner. Adapt the following strategy into a "
                f"task plan for this issue.\n"
                f"Issue: {issue}\n"
                f"Existing strategy: {reusable_strategy.content[:500]}\n"
            )
        else:
            base_prompt = (
                f"You are a software engineering planner. Create a step-by-step task plan "
                f"for the following issue.\n"
                f"Issue: {issue}\n"
                f"Repository context (summary):\n{context[:1000]}\n"
            )

        for attempt in range(self.MAX_RETRIES):
            prompt = (
                f"{base_prompt}\n"
                f"IMPORTANT: Return ONLY a JSON object with this exact structure (no extra keys):\n"
                f'{{"nodes": [\n'
                f'  {{"id": "task-1", "persona": "Explorer", "description": "Explore the codebase", "dependencies": [], "token_budget": 2000}},\n'
                f'  {{"id": "task-2", "persona": "Implementer", "description": "Implement the changes", "dependencies": ["task-1"], "token_budget": 3000}},\n'
                f'  {{"id": "task-3", "persona": "Verifier", "description": "Run tests and verify", "dependencies": ["task-2"], "token_budget": 1000}}\n'
                f']}}\n'
                f"Valid personas: Explorer, Implementer, Reviewer, Verifier.\n"
                f"Tailor the descriptions specifically to: {issue}"
            )

            print(f"[Planner] Attempt {attempt + 1}/{self.MAX_RETRIES} to generate task graph (timeout={self.TIMEOUT_SECONDS}s)...")
            start = time.time()

            try:
                # Use threading to enforce a timeout
                import threading
                result_holder = [None]
                error_holder = [None]

                def run():
                    try:
                        result_holder[0] = self.llm_adapter.generate_structured(
                            prompt=prompt,
                            schema=TaskGraph
                        )
                    except Exception as e:
                        error_holder[0] = e

                thread = threading.Thread(target=run, daemon=True)
                thread.start()
                thread.join(timeout=self.TIMEOUT_SECONDS)

                elapsed = time.time() - start

                if thread.is_alive():
                    print(f"[Planner] Attempt {attempt + 1} timed out after {self.TIMEOUT_SECONDS}s. Retrying...")
                    continue

                if error_holder[0]:
                    print(f"[Planner] Attempt {attempt + 1} error: {error_holder[0]}")
                    continue

                graph = result_holder[0]

                if graph and len(graph.nodes) > 0:
                    print(f"[Planner] Success! Generated {len(graph.nodes)} tasks in {elapsed:.1f}s")
                    return graph
                else:
                    print(f"[Planner] Attempt {attempt + 1}: LLM returned 0 tasks. Retrying with simpler prompt...")

            except Exception as e:
                print(f"[Planner] Attempt {attempt + 1} unexpected error: {e}")

        # All attempts failed — use deterministic fallback
        print(f"[Planner] All {self.MAX_RETRIES} attempts failed or returned 0 tasks. Using fallback plan.")
        return _make_fallback_graph(issue)

    def replan(self, original_graph: TaskGraph, failure_info: str, context: str) -> TaskGraph:
        """Dynamic replanning when a task fails."""
        prompt = (
            f"A task in the plan failed. Create a new recovery plan.\n"
            f"Original plan had {len(original_graph.nodes)} tasks.\n"
            f"Failure: {failure_info[:300]}\n"
            f"Context: {context[:500]}\n\n"
            f"Return ONLY a JSON: {{\"nodes\": [{{\"id\": \"...\", \"persona\": \"...\", "
            f"\"description\": \"...\", \"dependencies\": [], \"token_budget\": 2000}}]}}"
        )

        start = time.time()
        result_holder = [None]

        def run():
            try:
                result_holder[0] = self.llm_adapter.generate_structured(prompt, TaskGraph)
            except Exception:
                pass

        import threading
        thread = threading.Thread(target=run, daemon=True)
        thread.start()
        thread.join(timeout=self.TIMEOUT_SECONDS)

        if result_holder[0] and len(result_holder[0].nodes) > 0:
            return result_holder[0]

        return _make_fallback_graph(failure_info[:100])
