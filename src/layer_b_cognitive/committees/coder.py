from src.schemas import TaskNode, ToolCallRequest
from config import Config
import json

class CoderAgent:
    """Implementer persona. Writes code to solve the issue."""
    def __init__(self, llm_adapter):
        self.llm_adapter = llm_adapter
        self.system_prompt = "You are the Coder. Write code to solve the issue. Use write_file, read_file, run_command actions."

    def execute(self, task: TaskNode, context: str) -> list:
        prompt = (
            f"Task Description: {task.description}\n"
            f"Context:\n{context}\n\n"
            f"Determine the first tool action to take. When finished, use the 'complete' action."
        )
        output_log = [f"Starting task execution for persona: Coder"]
        
        for i in range(Config.MAX_AGENT_ACTIONS):
            try:
                tool_call: ToolCallRequest = self.llm_adapter.generate_structured(
                    prompt=prompt,
                    schema=ToolCallRequest,
                    system_prompt=self.system_prompt
                )
            except Exception as e:
                output_log.append(f"LLM Error generating tool call: {str(e)}")
                break

            if tool_call.action.lower() == 'complete':
                output_log.append("Agent signaled completion.")
                break

            output_log.append(f"Action: {tool_call.action}")
            output_log.append(f"Parameters: {json.dumps(tool_call.parameters)}")
            
        return output_log
