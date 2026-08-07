import argparse
import sys
import os
import uuid
import subprocess
from src.orchestrator import Orchestrator

def main():
    parser = argparse.ArgumentParser(description="AE-01 Unified Agentic Coding Harness")
    parser.add_argument("repo_path", help="Path to the repository to ingest")
    parser.add_argument("issue", help="The issue statement or feature request")
    
    # Advanced features and integrations
    parser.add_argument("--model", type=str, help="Specify the Ollama model to use (e.g. llama3.2:latest)")
    parser.add_argument("--ollama-url", type=str, help="Custom Ollama endpoint URL")
    parser.add_argument("--auto-push", action="store_true", help="Automatically commit and push changes")
    parser.add_argument("--is-baseline", action="store_true", help="Run in baseline (naive) mode for A/B testing")
    parser.add_argument("--comparison-group-id", type=str, help="Group ID for A/B testing comparisons")
    parser.add_argument("--run-id", type=str, help="Custom Run ID (defaults to auto-generated)")
    
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
    
    # Generate run ID if not provided
    run_id = args.run_id or f"RUN-{str(uuid.uuid4())[:8].upper()}"
    print(f"Starting execution for {run_id}...")
    
    try:
        orchestrator = Orchestrator(
            repo_path=repo_path, 
            issue_statement=args.issue,
            model=args.model,
            ollama_url=args.ollama_url,
            auto_push=args.auto_push,
            run_id=run_id,
            is_baseline=args.is_baseline,
            comparison_group_id=args.comparison_group_id
        )
        orchestrator.run()
        print(f"Execution completed. Artifacts saved to outputs/{run_id}/")
    except Exception as e:
        print(f"Harness execution failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
