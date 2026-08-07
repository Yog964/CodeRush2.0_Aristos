import argparse
import sys
import os
import tempfile
import subprocess
from src.orchestrator import Orchestrator

def main():
    parser = argparse.ArgumentParser(description="AE-01 Unified Agentic Coding Harness")
    parser.add_argument("repo_path", help="Path to the repository to ingest")
    parser.add_argument("issue", help="The issue statement or feature request")
    
    args = parser.parse_args()
    
    repo_path = args.repo_path
    temp_dir = None
    
    if repo_path.startswith("http://") or repo_path.startswith("https://"):
        print(f"Cloning repository {repo_path}...")
        temp_dir = tempfile.TemporaryDirectory()
        try:
            subprocess.run(["git", "clone", repo_path, temp_dir.name], check=True)
            repo_path = temp_dir.name
        except subprocess.CalledProcessError as e:
            print(f"Failed to clone repository: {e}")
            sys.exit(1)
    
    try:
        orchestrator = Orchestrator(repo_path=repo_path, issue_statement=args.issue)
        orchestrator.run()
    except Exception as e:
        print(f"Harness execution failed: {e}")
        sys.exit(1)
    finally:
        if temp_dir:
            temp_dir.cleanup()

if __name__ == "__main__":
    main()
