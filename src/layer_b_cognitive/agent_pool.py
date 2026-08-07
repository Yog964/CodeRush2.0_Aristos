import json
from src.schemas import TaskNode, ToolCallRequest
from config import Config

class AgentPool:
    """Manages persona-based agents and their tool execution loops."""

    def __init__(self, llm_adapter, tool_engine, memory_manager):
        self.llm_adapter = llm_adapter
        self.tool_engine = tool_engine
        self.memory_manager = memory_manager

        self.personas = {
            "Explorer": "You are the Explorer. Understand the codebase. Use read_file, list_directory, search_text, run_command actions only.",
            "Implementer": "You are the Implementer. Write code to solve the issue. Use write_file, read_file, run_command actions.",
            "Reviewer": "You are the Reviewer. Review code quality and logic. Use read_file, run_command actions only.",
            "Verifier": "You are the Verifier. Run tests and verify changes. Use run_command, read_file actions only."
        }

    def execute_task(self, task: TaskNode, context: str) -> str:
        """Main execution loop for a task using the assigned persona."""
        system_prompt = self.personas.get(task.persona, "You are a helpful coding assistant.")
        
        prompt = (
            f"Task Description: {task.description}\n"
            f"Context:\n{context}\n\n"
            f"Determine the first tool action to take. When finished, use the 'complete' action."
        )
        
        output_log = []
        output_log.append(f"Starting task execution for persona: {task.persona}")

        for i in range(Config.MAX_AGENT_ACTIONS):
            try:
                # We assume the adapter supports system_prompt injection for structured output
                tool_call: ToolCallRequest = self.llm_adapter.generate_structured(
                    prompt=prompt,
                    schema=ToolCallRequest,
                    system_prompt=system_prompt
                )
            except Exception as e:
                output_log.append(f"LLM Error generating tool call: {str(e)}")
                break

            if tool_call.action.lower() == 'complete':
                output_log.append("Agent signaled completion.")
                break

            output_log.append(f"Action: {tool_call.action}")
            output_log.append(f"Parameters: {json.dumps(tool_call.parameters)}")

            try:
                # Execute tool via tool engine
                result = self.tool_engine.execute(tool_call)
                output_log.append(f"Result:\n{result}")
                
                # Feed result back into the prompt
                prompt += (
                    f"\n\nExecuted Action: {tool_call.action}\n"
                    f"Result: {result}\n"
                    f"Determine the next tool action to take. If the task is finished, use the 'complete' action."
                )
            except Exception as e:
                error_msg = f"Tool Execution Error: {str(e)}"
                output_log.append(error_msg)
                prompt += (
                    f"\n\nExecuted Action: {tool_call.action}\n"
                    f"Error: {str(e)}\n"
                    f"Correct the error or take a different action."
                )

        if len(output_log) > Config.MAX_AGENT_ACTIONS:
            output_log.append("Max agent actions reached. Stopping task early.")
            
        return "\n".join(output_log)
