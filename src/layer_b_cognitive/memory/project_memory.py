class ProjectMemory:
    """Long-term ROM. Interfaces directly with harness_memory.db to retrieve cross-run verified strategies."""
    def __init__(self, db_manager):
        # Wraps the existing sqlite MemoryManager for backwards compatibility
        self.db = db_manager

    def store_strategy(self, issue: str, resolution: str):
        self.db.add_memory(issue, resolution, status="verified")

    def retrieve_strategies(self, query: str):
        # In a full implementation, this would use semantic search.
        # For now, it delegates to the SQLite fetch.
        return self.db.get_relevant_memories(query)
