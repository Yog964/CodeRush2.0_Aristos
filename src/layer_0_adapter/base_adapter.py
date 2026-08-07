"""
Layer 0 – Base LLM Adapter (Abstract Interface)
All LLM adapters must inherit from this class.
"""
import json
from abc import ABC, abstractmethod
from typing import Type, TypeVar, List, Dict, Any

from pydantic import BaseModel

from src.schemas import LLMResponse

T = TypeVar('T', bound=BaseModel)


class BaseLLMAdapter(ABC):
    """Abstract base class for all LLM adapters."""

    def __init__(self):
        self._total_tokens_used: int = 0
        self._total_calls: int = 0

    @property
    def model_name(self) -> str:
        """Return the name of the model being used."""
        return "unknown"

    @property
    def total_tokens_used(self) -> int:
        return self._total_tokens_used

    @property
    def total_calls(self) -> int:
        return self._total_calls

    @abstractmethod
    def generate(self, prompt: str, system_prompt: str = "",
                 format: str = "json") -> LLMResponse:
        """Generate a response from the LLM."""
        pass

    @abstractmethod
    def generate_structured(self, prompt: str, schema: Type[T],
                            system_prompt: str = "") -> T:
        """Generate a structured response validated against a Pydantic schema."""
        pass

    @abstractmethod
    def chat(self, messages: List[Dict[str, str]],
             system_prompt: str = "") -> LLMResponse:
        """Chat-style multi-turn generation."""
        pass

    @abstractmethod
    def check_health(self) -> bool:
        """Check if the LLM service is available and the model is loaded."""
        pass
