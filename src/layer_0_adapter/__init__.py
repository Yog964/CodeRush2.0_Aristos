"""Layer 0 – Model Independent Adapter"""
from .ollama_adapter import OllamaAdapter
from .base_adapter import BaseLLMAdapter

__all__ = ["OllamaAdapter", "BaseLLMAdapter"]
