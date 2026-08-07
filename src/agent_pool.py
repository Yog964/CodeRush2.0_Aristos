from .schemas import TaskNode, ToolCallRequest
from .llm import LLMClient
from .sandbox import SandboxExecutor
from .memory import MemoryManager
import json

class BasePersona:
    def __init__(self, llm: LLMClient, sandbox: SandboxExecutor, memory: MemoryManager):
        self.llm = llm
        self.sandbox = sandbox
        self.memory = memory
        self.system_prompt = "You are a generic AI agent."

    def execute_task(self, task: TaskNode) -> str:
        """Executes a task. Should be overridden by specific personas."""
        context = self.memory.get_all_context()
        prompt = f"Context:\n{context}\n\nTask: {task.description}\n\nFormulate a ToolCallRequest to make progress."
        
        # Enforce ToolCallRequest schema
        tool_call = self.llm.get_structured_output(prompt, ToolCallRequest, self.system_prompt)
        
        # Simple loop for up to 3 actions per task to prevent infinite loops
        output_log = []
        for _ in range(3):
            if tool_call.action == "read_file":
                filepath = tool_call.parameters.get("filepath", "")
                content = self.sandbox.read_file(filepath)
                output_log.append(f"Read {filepath}: {len(content)} bytes")
                # Inform LLM of result and ask for next step or 'complete'
                prompt = f"File content:\n{content[:1000]}...\n\nIf done, emit action='complete'. Otherwise next tool call."
                tool_call = self.llm.get_structured_output(prompt, ToolCallRequest, self.system_prompt)
                
            elif tool_call.action == "run_command":
                cmd = tool_call.parameters.get("command", "")
                
                # TASK 1: Policy Engine Interception
                from .policy_engine import PolicyEngine
                is_allowed, reason = PolicyEngine.is_allowed(cmd)
                
                if not is_allowed:
                    output_log.append(f"[Policy Engine] REJECTED: {cmd} - {reason}")
                    prompt = f"[Policy Engine] Command rejected for security: {reason}.\n\nFormulate an alternative ToolCallRequest or 'complete'."
                else:
                    code, stdout, stderr = self.sandbox.execute_command(cmd)
                    
                    # TASK 2: Failure Recovery Engine
                    if code != 0:
                        err_msg = stderr if stderr else stdout
                        output_log.append(f"[Recovery Engine] Analyzing Root Cause -> Retrying (Exit {code})")
                        output_log.append(f"Cmd: {cmd}\nCode: {code}\nOutput: {err_msg}")
                        prompt = f"[Recovery Engine] Command failed with exit code {code}.\nOutput: {err_msg}\n\nAnalyze the root cause and formulate a corrective ToolCallRequest."
                    else:
                        output_log.append(f"Cmd: {cmd}\nCode: {code}\nOutput: {stdout}")
                        prompt = f"Command exited with {code}.\nOutput: {stdout}\n\nIf done, emit action='complete'. Otherwise next tool call."
                
                tool_call = self.llm.get_structured_output(prompt, ToolCallRequest, self.system_prompt)
                
            elif tool_call.action == "write_file":
                filepath = tool_call.parameters.get("filepath", "")
                content = tool_call.parameters.get("content", "")
                result_msg = self.sandbox.write_file(filepath, content)
                output_log.append(result_msg)
                
                prompt = f"Write result:\n{result_msg}\n\nIf done, emit action='complete'. Otherwise next tool call."
                tool_call = self.llm.get_structured_output(prompt, ToolCallRequest, self.system_prompt)
                
            elif tool_call.action == "complete":
                output_log.append("Task completed.")
                break
            else:
                output_log.append(f"Unknown action: {tool_call.action}")
                break
                
        return "\n".join(output_log)

class Explorer(BasePersona):
    def __init__(self, llm, sandbox, memory):
        super().__init__(llm, sandbox, memory)
        self.system_prompt = "You are the Explorer. Your job is to locate files and understand the repo structure. Use ONLY read_file and run_command."

class Implementer(BasePersona):
    def __init__(self, llm, sandbox, memory):
        super().__init__(llm, sandbox, memory)
        self.system_prompt = "You are the Implementer. Your job is to write code and apply bug fixes. Use ONLY write_file, read_file, and run_command."

class Reviewer(BasePersona):
    def __init__(self, llm, sandbox, memory):
        super().__init__(llm, sandbox, memory)
        self.system_prompt = "You are the Reviewer. Check logic and style. Use ONLY read_file and run_command. DO NOT use review_code."

class Verifier(BasePersona):
    def __init__(self, llm, sandbox, memory):
        super().__init__(llm, sandbox, memory)
        self.system_prompt = "You are the Verifier. Run tests and linters. Use ONLY run_command and read_file. DO NOT use verify_calling_feature."

class AgentPool:
    def __init__(self, llm: LLMClient, sandbox: SandboxExecutor, memory: MemoryManager):
        self.personas = {
            "Explorer": Explorer(llm, sandbox, memory),
            "Implementer": Implementer(llm, sandbox, memory),
            "Reviewer": Reviewer(llm, sandbox, memory),
            "Verifier": Verifier(llm, sandbox, memory)
        }

    def assign_task(self, task: TaskNode) -> str:
        persona = self.personas.get(task.persona)
        if not persona:
            return f"Error: Unknown persona {task.persona}"
        print(f"[{task.persona}] Executing: {task.description}")
        return persona.execute_task(task)
