from typing import List, Dict, Any
from datetime import datetime
from rich.console import Console
from src.schemas import EventLog, EventType

class EventLogger:
    def __init__(self):
        self.console = Console()
        self.events: List[EventLog] = []
        self.start_time = datetime.now()
        self.callbacks = []

    def register_callback(self, cb):
        self.callbacks.append(cb)

    def log(self, layer: str, component: str, event_type: str, message: str, data: Dict[str, Any] = None):
        if data is None:
            data = {}
        event = EventLog(
            timestamp=datetime.now().isoformat(),
            layer=layer,
            component=component,
            event_type=event_type,
            message=message,
            data=data
        )
        self.events.append(event)
        for cb in self.callbacks:
            try:
                cb(event)
            except Exception:
                pass

        color = "white"
        if event_type in [EventType.INFO.value, EventType.LAYER_START.value]:
            color = "blue"
        elif event_type == EventType.TOOL_CALL.value:
            color = "green"
        elif event_type == EventType.ERROR.value:
            color = "red"
        elif event_type == EventType.RECOVERY.value:
            color = "yellow"
        
        self.console.print(f"[{color}][{layer} - {component}] {message}[/{color}]")

    def log_layer_start(self, layer_name: str):
        self.log(layer_name, "Core", EventType.LAYER_START.value, f"Starting {layer_name}")

    def log_layer_end(self, layer_name: str, duration: float):
        self.log(layer_name, "Core", EventType.LAYER_END.value, f"Completed {layer_name} in {duration:.2f}s")

    def log_tool_call(self, action: str, params: dict, result: str):
        self.log("Action", "ToolEngine", EventType.TOOL_CALL.value, f"Executed {action}", {"params": params, "result": result})

    def log_llm_call(self, prompt_preview: str, tokens: int):
        self.log("LLM", "Adapter", EventType.LLM_CALL.value, f"LLM Call ({tokens} tokens): {prompt_preview[:50]}...")

    def log_error(self, component: str, error: str):
        self.log("System", component, EventType.ERROR.value, f"Error: {error}")

    def get_all_events(self) -> List[EventLog]:
        return self.events
