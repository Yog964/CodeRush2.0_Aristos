class WorkingMemory:
    """Ephemeral RAM. Manages context for the current run, storing intermediate tool outputs and task transitions."""
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.context_blocks = []

    def add_context(self, block: str):
        self.context_blocks.append(block)

    def get_context(self) -> str:
        return "\n".join(self.context_blocks)
