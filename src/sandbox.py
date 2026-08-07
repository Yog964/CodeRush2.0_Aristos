import docker
import os
import subprocess
from typing import Tuple

class SandboxExecutor:
    def __init__(self, repo_path: str, image: str = "python:3.10-slim"):
        self.repo_path = os.path.abspath(repo_path)
        self.image = image
        self.use_local_fallback = False
        try:
            self.client = docker.from_env()
            # Ensure image is pulled
            try:
                self.client.images.get(self.image)
            except docker.errors.ImageNotFound:
                print(f"Pulling sandbox image {self.image}...")
                self.client.images.pull(self.image)
        except Exception as e:
            print(f"Warning: Docker not available, using local fallback execution. (Error: {e})")
            self.use_local_fallback = True

    def execute_command(self, command: str) -> Tuple[int, str, str]:
        """
        Executes a shell command inside a sandboxed Docker container.
        The repository is mounted as a volume.
        Returns: (exit_code, stdout, stderr)
        """
        if self.use_local_fallback:
            try:
                result = subprocess.run(
                    command,
                    shell=True,
                    cwd=self.repo_path,
                    capture_output=True,
                    text=True
                )
                return result.returncode, result.stdout, result.stderr
            except Exception as e:
                return -1, "", str(e)
                
        try:
            container = self.client.containers.run(
                self.image,
                command=command,
                volumes={self.repo_path: {'bind': '/workspace', 'mode': 'rw'}},
                working_dir='/workspace',
                detach=True,
                remove=False # Keep container to inspect exit code and logs
            )
            
            result = container.wait()
            exit_code = result['StatusCode']
            
            logs = container.logs(stdout=True, stderr=True, stream=False)
            output = logs.decode('utf-8')
            
            # Since docker-py blends stdout and stderr in .logs(), we simplify here
            # In a robust implementation, we'd use multiplexing to separate them.
            container.remove()
            return exit_code, output, ""
            
        except Exception as e:
            return -1, "", str(e)

    def read_file(self, filepath: str) -> str:
        """Reads a file directly from the local repo path (safe as it's just reading)."""
        full_path = os.path.join(self.repo_path, filepath)
        if not os.path.exists(full_path):
            return f"Error: File not found: {filepath}"
        if os.path.isdir(full_path):
            return f"Error: {filepath} is a directory."
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            return f"Error reading file {filepath}: {e}"

    def write_file(self, filepath: str, content: str):
        """Writes a file to the local repo path."""
        full_path = os.path.join(self.repo_path, filepath)
        # Ensure directory exists
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        try:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
        except Exception as e:
            print(f"Failed to write file {filepath}: {e}")
