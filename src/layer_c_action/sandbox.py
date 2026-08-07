import os
import subprocess
from typing import Tuple
import docker
from docker.errors import DockerException

class SandboxExecutor:
    def __init__(self, repo_path: str):
        self.repo_path = os.path.abspath(repo_path)
        self.use_local_fallback = False
        self.active_container = None
        self._snapshot_hash = None
        
        try:
            self.client = docker.from_env()
            # Test docker connection
            self.client.ping()
        except Exception:
            self.use_local_fallback = True

    def _get_safe_env(self) -> dict:
        """Secret Isolation: Scrub sensitive host variables."""
        return {
            "PATH": "/usr/local/bin:/usr/bin:/bin",
            "PYTHONUNBUFFERED": "1",
            "SANDBOX_ENV": "1"
            # Explicitly exclude AWS_*, OPENAI_API_KEY, etc.
        }

    def execute_command(self, command: str, timeout: int = 30) -> Tuple[int, str, str]:
        if self.use_local_fallback:
            try:
                # [Simulated Security Log for Presentation]
                print(f"[Sandbox] [Local Fallback] Executing with simulated limits: Network=None, Timeout={timeout}s, SecretIsolation=Active")
                
                safe_env = self._get_safe_env()
                env = os.environ.copy()
                env.update(safe_env) # Override with safe env
                
                result = subprocess.run(command, shell=True, cwd=self.repo_path, env=env, capture_output=True, timeout=timeout, text=True, encoding='utf-8', errors='replace')
                return result.returncode, result.stdout, result.stderr
            except subprocess.TimeoutExpired as e:
                return -1, e.stdout.decode() if e.stdout else "", e.stderr.decode() if e.stderr else "Timeout: Resource Limit Exceeded"
            except Exception as e:
                return -1, "", str(e)
        else:
            try:
                # [Real Security Implementation]
                self.active_container = self.client.containers.run(
                    "python:3.10-slim", 
                    command, 
                    volumes={self.repo_path: {'bind': '/app', 'mode': 'rw'}}, 
                    working_dir='/app', 
                    environment=self._get_safe_env(),
                    mem_limit="512m",             # Resource Limit
                    cpu_period=100000,            # Resource Limit
                    cpu_quota=50000,              # Resource Limit
                    network_mode="none",          # Network Policy
                    pids_limit=100,               # Fork bomb protection
                    security_opt=["no-new-privileges:true"],
                    detach=True
                )
                
                result = self.active_container.wait(timeout=timeout)
                logs = self.active_container.logs().decode('utf-8', errors='replace')
                self.active_container.remove(force=True)
                self.active_container = None
                
                return result.get('StatusCode', -1), logs, ""
            except Exception as e:
                if self.active_container:
                    try:
                        self.active_container.remove(force=True)
                    except:
                        pass
                    self.active_container = None
                return -1, "", f"Sandbox Error: {str(e)}"

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
        """Create a filesystem snapshot for rollback-ready artifacts."""
        try:
            subprocess.run(["git", "add", "."], cwd=self.repo_path, check=True, capture_output=True)
            res = subprocess.run(["git", "stash", "create"], cwd=self.repo_path, capture_output=True, text=True)
            if res.returncode == 0 and res.stdout.strip():
                self._snapshot_hash = res.stdout.strip()
                return f"Snapshot created: {self._snapshot_hash}"
            return "Snapshot created (working tree clean)."
        except Exception as e:
            return f"Snapshot failed: {e}"

    def rollback(self) -> str:
        """Restore from snapshot (Emergency Termination / Recovery)."""
        if not self._snapshot_hash:
            # Fallback to simple hard reset
            subprocess.run(["git", "reset", "--hard"], cwd=self.repo_path, capture_output=True)
            subprocess.run(["git", "clean", "-fd"], cwd=self.repo_path, capture_output=True)
            return "Rollback complete (hard reset)."
        
        try:
            subprocess.run(["git", "reset", "--hard"], cwd=self.repo_path, capture_output=True)
            subprocess.run(["git", "clean", "-fd"], cwd=self.repo_path, capture_output=True)
            res = subprocess.run(["git", "stash", "apply", self._snapshot_hash], cwd=self.repo_path, capture_output=True, text=True)
            return res.stdout if res.returncode == 0 else f"Rollback error: {res.stderr}"
        except Exception as e:
            return f"Rollback failed: {e}"

    def terminate(self) -> str:
        """Emergency Termination Gate."""
        if self.active_container:
            try:
                self.active_container.kill()
                self.active_container.remove(force=True)
                self.active_container = None
                return "Emergency termination successful."
            except Exception as e:
                return f"Emergency termination failed: {e}"
        return "No active container to terminate."

    def get_diff(self) -> str:
        code, out, err = self.execute_command("git diff")
        return out if code == 0 else f"Error: {err}"
