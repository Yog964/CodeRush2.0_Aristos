import json
import os
from datetime import datetime
from src.schemas import ExecutionTrace, EventLog

class TraceCollector:
    def __init__(self):
        self.trace = ExecutionTrace(start_time=datetime.now().isoformat())

    def record_llm_call(self, tokens: int):
        self.trace.llm_calls += 1
        self.trace.total_tokens += tokens

    def record_layer_complete(self, layer_name: str):
        self.trace.layers_completed.append(layer_name)

    def add_event(self, event: EventLog):
        self.trace.events.append(event)

    def finalize(self) -> ExecutionTrace:
        self.trace.end_time = datetime.now().isoformat()
        return self.trace

    def save_to_file(self, output_dir: str):
        os.makedirs(output_dir, exist_ok=True)
        with open(os.path.join(output_dir, 'execution_trace.json'), 'w') as f:
            f.write(self.trace.model_dump_json(indent=2) if hasattr(self.trace, 'model_dump_json') else self.trace.json(indent=2))
