class EpisodicMemory:
    """Short-term logs. Stores the exact sequence of events, agent decisions, and tool errors for rollback analysis."""
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.episodes = []

    def log_episode(self, event_type: str, details: str):
        self.episodes.append({"event_type": event_type, "details": details})

    def retrieve_recent(self, n: int = 5) -> list:
        return self.episodes[-n:]
