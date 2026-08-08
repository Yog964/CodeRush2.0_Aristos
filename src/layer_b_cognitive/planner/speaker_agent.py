from .task_graph import TaskGraphManager

class SpeakerAgent:
    """The 'Speaker of the House'. Orchestrates the debate between the Coder and Reviewer, finalizing the Task Graph."""
    def __init__(self, llm_adapter):
        self.llm_adapter = llm_adapter

    def orchestrate_debate(self, issue: str, intelligence_report: dict) -> list:
        # In a full implementation, this agent queries Developer and Reviewer 
        # via the LLM adapter to form a consensus Task Graph.
        # For this MVP, we return a basic fallback plan graph.
        
        from src.schemas import TaskNode
        t1 = TaskNode(id="T1", description=f"Analyze {issue}", persona="Explorer", dependencies=[])
        t2 = TaskNode(id="T2", description="Implement fix based on analysis", persona="Implementer", dependencies=["T1"])
        t3 = TaskNode(id="T3", description="Review and verify changes", persona="Reviewer", dependencies=["T2"])
        
        return [t1, t2, t3]
