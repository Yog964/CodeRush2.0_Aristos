"""
Unified Agentic Coding Harness – Central Configuration
"""
import os


class Config:
    """Central configuration loaded from environment variables with defaults."""

    # Layer 0 - LLM Adapter Settings
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2:latest")
    OLLAMA_TIMEOUT: int = int(os.getenv("OLLAMA_TIMEOUT", "120"))
    OLLAMA_MAX_RETRIES: int = int(os.getenv("OLLAMA_MAX_RETRIES", "3"))

    # Token Budgets
    CONTEXT_TOKEN_BUDGET: int = int(os.getenv("CONTEXT_TOKEN_BUDGET", "4000"))
    TASK_TOKEN_BUDGET: int = int(os.getenv("TASK_TOKEN_BUDGET", "2000"))

    # Agent Settings
    MAX_AGENT_ACTIONS: int = int(os.getenv("MAX_AGENT_ACTIONS", "5"))
    MAX_PLAN_RETRIES: int = int(os.getenv("MAX_PLAN_RETRIES", "2"))

    # Sandbox Settings
    DOCKER_IMAGE: str = os.getenv("DOCKER_IMAGE", "python:3.10-slim")
    COMMAND_TIMEOUT: int = int(os.getenv("COMMAND_TIMEOUT", "30"))
    USE_DOCKER: bool = os.getenv("USE_DOCKER", "false").lower() == "true"

    # Output Settings
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "output")
    DB_PATH: str = os.getenv("DB_PATH", "harness_memory.db")

    # Git Settings
    AUTO_PUSH: bool = os.getenv("AUTO_PUSH", "false").lower() == "true"
    GIT_USER_NAME: str = os.getenv("GIT_USER_NAME", "AE-01 Agent")
    GIT_USER_EMAIL: str = os.getenv("GIT_USER_EMAIL", "agent@harness.local")

    # Confidence Weights
    WEIGHT_TESTS: float = 0.30
    WEIGHT_BUILD: float = 0.20
    WEIGHT_LINT: float = 0.15
    WEIGHT_SECURITY: float = 0.15
    WEIGHT_PLAN_QUALITY: float = 0.10
    WEIGHT_MINIMAL_CHANGES: float = 0.10
