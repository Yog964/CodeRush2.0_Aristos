class TaskGraphManager:
    """Isolates the DAG (Directed Acyclic Graph) traversal logic, managing dependencies and status transitions."""
    def __init__(self, task_nodes: list):
        self.nodes = {task.id: task for task in task_nodes}
        self.dependencies = {task.id: task.dependencies for task in task_nodes}
        self.status = {task.id: "TODO" for task in task_nodes}

    def get_next_unblocked_task(self):
        for task_id, deps in self.dependencies.items():
            if self.status[task_id] == "TODO":
                if all(self.status[d] == "DONE" for d in deps):
                    return self.nodes[task_id]
        return None

    def mark_done(self, task_id: str):
        if task_id in self.status:
            self.status[task_id] = "DONE"
