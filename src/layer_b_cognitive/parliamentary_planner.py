import json
from typing import Optional
from src.schemas import TaskGraph, TaskNode, MemoryLayer
from src.layer_b_cognitive.memory_manager import MemoryManager

class ParliamentaryPlanner:
    """Planner that generates task graphs using parliamentary personas."""

    def __init__(self, llm_adapter, memory_manager: Optional[MemoryManager] = None):
        self.llm_adapter = llm_adapter
        self.memory_manager = memory_manager or MemoryManager()

    def plan(self, issue: str, context: str) -> TaskGraph:
        """Create a plan for the issue, attempting to reuse strategies."""
        strategies = self.memory_manager.get_by_layer(MemoryLayer.STRATEGY.value)
        reusable_strategy = None
        
        # Simple keyword matching heuristic
        issue_lower = issue.lower()
        for strategy in strategies:
            # Assuming strategy content contains keywords or is a JSON with keywords
            # For simplicity, we just check if some words overlap
            strategy_words = set(strategy.content.lower().split())
            issue_words = set(issue_lower.split())
            if len(strategy_words.intersection(issue_words)) > 2:
                reusable_strategy = strategy
                break

        if reusable_strategy:
            prompt = (
                f"Adapt the following existing strategy into a precise TaskGraph to solve the issue.\n"
                f"Issue: {issue}\n"
                f"Context: {context}\n"
                f"Strategy Content: {reusable_strategy.content}\n"
                f"Ensure tasks use personas: Explorer, Implementer, Reviewer, Verifier."
            )
        else:
            prompt = (
                f"Create a TaskGraph to solve the following issue.\n"
                f"Issue: {issue}\n"
                f"Context: {context}\n"
                f"Create tasks with the following personas: Explorer (understand code), "
                f"Implementer (make changes), Reviewer (check quality), Verifier (run tests).\n"
                f"Each task must get a clear description and proper dependencies."
            )

        # Assuming llm_adapter has generate_structured(prompt: str, schema_class: Type[T]) -> T
        return self.llm_adapter.generate_structured(prompt, TaskGraph)

    def replan(self, original_graph: TaskGraph, failure_info: str, context: str) -> TaskGraph:
        """Dynamic replanning when a task fails."""
        prompt = (
            f"The execution of the task graph failed. Replan the remaining work to recover and complete the issue.\n"
            f"Original Graph: {original_graph.model_dump_json()}\n"
            f"Failure Info: {failure_info}\n"
            f"Context: {context}\n"
            f"Generate an updated TaskGraph to resolve the failure and finish the work."
        )
        return self.llm_adapter.generate_structured(prompt, TaskGraph)
