import os
import time
from typing import Optional
from src.schemas import ToolCallRequest, ToolCallResult
from .sandbox import SandboxExecutor

class ToolEngine:
    def __init__(self, sandbox: SandboxExecutor, event_logger=None):
        self.sandbox = sandbox
        self.event_logger = event_logger

    def execute(self, tool_call: ToolCallRequest) -> ToolCallResult:
        start_time = time.time()
        result = ToolCallResult(success=True, output="")
        try:
            if tool_call.action == "read_file":
                filepath = tool_call.parameters.get("filepath") or tool_call.parameters.get("file_path") or tool_call.parameters.get("filename") or ""
                output = self.sandbox.read_file(filepath)
                if output.startswith("Error"):
                    result.success = False
                    result.error = output
                else:
                    result.output = output
            elif tool_call.action == "write_file":
                filepath = tool_call.parameters.get("filepath") or tool_call.parameters.get("file_path") or tool_call.parameters.get("filename") or tool_call.parameters.get("file_name") or ""
                content = tool_call.parameters.get("content") or tool_call.parameters.get("contents") or ""
                output = self.sandbox.write_file(filepath, content)
                if output.startswith("Error"):
                    result.success = False
                    result.error = output
                else:
                    result.output = output
            elif tool_call.action == "run_command":
                cmd = tool_call.parameters.get("command") or tool_call.parameters.get("cmd") or ""
                code, out, err = self.sandbox.execute_command(cmd)
                if code == 0:
                    result.output = out
                else:
                    result.success = False
                    result.error = err
            elif tool_call.action == "list_directory":
                path = os.path.join(self.sandbox.repo_path, tool_call.parameters.get("path", "."))
                result.output = str(os.listdir(path))
            elif tool_call.action == "search_text":
                pattern = tool_call.parameters.get("pattern", "")
                path = tool_call.parameters.get("path", ".")
                # fallback for windows/linux simple text search using shell
                code, out, err = self.sandbox.execute_command(f"grep -rn '{pattern}' {path} || findstr /S /M '{pattern}' {path}\\*")
                result.output = out
            elif tool_call.action == "git_diff":
                result.output = self.sandbox.get_diff()
            elif tool_call.action == "git_log":
                n = tool_call.parameters.get("n", 5)
                code, out, err = self.sandbox.execute_command(f"git log --oneline -n {n}")
                result.output = out
            elif tool_call.action == "complete":
                result.output = "Task completed"
            else:
                result.success = False
                result.error = "Unknown action"
        except Exception as e:
            result.success = False
            result.error = str(e)
            
        result.duration_ms = (time.time() - start_time) * 1000
        
        if self.event_logger:
            self.event_logger.log_tool_call(tool_call.action, tool_call.parameters, str(result.output) if result.success else str(result.error))
            
        return result
