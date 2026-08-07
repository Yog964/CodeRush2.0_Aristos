import os
import subprocess
from typing import Tuple
import docker
from docker.errors import DockerException

class SandboxExecutor:
    def __init__(self, repo_path: str):
        self.repo_path = os.path.abspath(repo_path)
        self.use_local_fallback = False
        try:
            self.client = docker.from_env()
        except DockerException:
            self.use_local_fallback = True

    def execute_command(self, command: str, timeout: int = 30) -> Tuple[int, str, str]:
        if self.use_local_fallback:
            try:
                result = subprocess.run(command, shell=True, cwd=self.repo_path, capture_output=True, timeout=timeout, text=True, encoding='utf-8', errors='replace')
                return result.returncode, result.stdout, result.stderr
            except subprocess.TimeoutExpired as e:
                return -1, e.stdout.decode() if e.stdout else "", e.stderr.decode() if e.stderr else "Timeout"
            except Exception as e:
                return -1, "", str(e)
        else:
            try:
                container = self.client.containers.run(
                    "python:3.10-slim", 
                    command, 
                    volumes={self.repo_path: {'bind': '/app', 'mode': 'rw'}}, 
                    working_dir='/app', 
                    detach=True
                )
                container.wait(timeout=timeout)
                logs = container.logs().decode('utf-8')
                return 0, logs, ""
            except Exception as e:
                self.use_local_fallback = True
                return self.execute_command(command, timeout)

    def read_file(self, filepath: str) -> str:
        try:
            with open(os.path.join(self.repo_path, filepath), 'r') as f:
                return f.read()
        except Exception as e:
            return f"Error reading file: {e}"

    def write_file(self, filepath: str, content: str) -> str:
        try:
            full_path = os.path.join(self.repo_path, filepath)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'w') as f:
                f.write(content)
            return f"Successfully wrote to {filepath}"
        except Exception as e:
            return f"Error writing file: {e}"

    def snapshot(self) -> str:
        return "Snapshot skipped for local testing."

    def rollback(self) -> str:
        code, out, err = self.execute_command("git stash pop")
        return out if code == 0 else f"Error: {err}"

    def get_diff(self) -> str:
        code, out, err = self.execute_command("git diff")
        return out if code == 0 else f"Error: {err}"
