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
    
    if repo_path.startswith("http://") or repo_path.startswith("https://"):
        repo_name = repo_path.rstrip('/').split('/')[-1]
        if repo_name.endswith('.git'):
            repo_name = repo_name[:-4]
            
        current_drive = os.path.splitdrive(os.getcwd())[0]
        if not current_drive:
            current_drive = "D:"
            
        base_dir = os.path.join(current_drive + os.sep, "CodeRush", "cloned repos")
        os.makedirs(base_dir, exist_ok=True)
        target_dir = os.path.join(base_dir, repo_name)
        
        print(f"Cloning repository {repo_path} into {target_dir}...")
        try:
            if not os.path.exists(target_dir):
                subprocess.run(["git", "clone", repo_path, target_dir], check=True)
            else:
                print(f"Directory {target_dir} already exists. Using existing repository.")
            repo_path = target_dir
        except subprocess.CalledProcessError as e:
            print(f"Failed to clone repository: {e}")
            sys.exit(1)
    
    try:
        orchestrator = Orchestrator(repo_path=repo_path, issue_statement=args.issue)
        orchestrator.run()
    except Exception as e:
        print(f"Harness execution failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
