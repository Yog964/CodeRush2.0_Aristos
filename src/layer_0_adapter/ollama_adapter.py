"""
Layer 0 – Ollama LLM Adapter
Implements BaseLLMAdapter for the Ollama REST API.
"""
import json
import time
from typing import Type, TypeVar, List, Dict, Any

import requests
from pydantic import BaseModel

from config import Config
from src.schemas import LLMResponse, TaskGraph, TaskNode, ToolCallRequest
from .base_adapter import BaseLLMAdapter

T = TypeVar('T', bound=BaseModel)


class OllamaAdapter(BaseLLMAdapter):
    """Ollama REST API adapter with retry, structured output, and health checks."""

    def __init__(self, base_url: str = None, model: str = None):
        super().__init__()
        self.base_url = base_url or Config.OLLAMA_BASE_URL
        self.model = model or Config.OLLAMA_MODEL
        self.timeout = Config.OLLAMA_TIMEOUT
        self.max_retries = Config.OLLAMA_MAX_RETRIES
        self.generate_endpoint = f"{self.base_url}/api/generate"
        self.chat_endpoint = f"{self.base_url}/api/chat"
        self.tags_endpoint = f"{self.base_url}/api/tags"

    @property
    def model_name(self) -> str:
        return self.model

    def check_health(self) -> bool:
        """Check if Ollama is running and the model is available."""
        try:
            resp = requests.get(self.tags_endpoint, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            models = [m.get("name", "") for m in data.get("models", [])]
            # Check if our model (or a variant) is available
            for m in models:
                if self.model in m or m.startswith(self.model):
                    return True
            # Model not found but Ollama is running
            if models:
                print(f"[Ollama] Available models: {models}")
                print(f"[Ollama] Requested model '{self.model}' not found. "
                      f"Will attempt to use it anyway.")
            return True
        except requests.exceptions.ConnectionError:
            print(f"[Ollama] Cannot connect to {self.base_url}")
            return False
        except Exception as e:
            print(f"[Ollama] Health check error: {e}")
            return False

    def generate(self, prompt: str, system_prompt: str = "",
                 format: str = "json") -> LLMResponse:
        """Generate a response from Ollama /api/generate endpoint."""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
        }
        if format:
            payload["format"] = format

        for attempt in range(self.max_retries):
            try:
                backoff = 2 ** attempt
                if attempt > 0:
                    time.sleep(backoff)

                resp = requests.post(
                    self.generate_endpoint,
                    json=payload,
                    timeout=self.timeout
                )
                resp.raise_for_status()
                data = resp.json()

                self._total_calls += 1
                tokens = data.get("eval_count", 0) + data.get("prompt_eval_count", 0)
                self._total_tokens_used += tokens

                return LLMResponse(
                    content=data.get("response", "{}"),
                    model=data.get("model", self.model),
                    total_duration_ns=data.get("total_duration", 0),
                    prompt_eval_count=data.get("prompt_eval_count", 0),
                    eval_count=data.get("eval_count", 0),
                    success=True
                )

            except requests.exceptions.ConnectionError:
                error = f"Connection refused at {self.base_url} (attempt {attempt+1})"
                print(f"[Ollama] {error}")
            except requests.exceptions.Timeout:
                error = f"Request timed out after {self.timeout}s (attempt {attempt+1})"
                print(f"[Ollama] {error}")
            except requests.exceptions.HTTPError as e:
                status = e.response.status_code if e.response is not None else "unknown"
                if status == 404:
                    error = f"Model '{self.model}' not found. Run: ollama pull {self.model}"
                else:
                    error = f"HTTP {status}: {e}"
                print(f"[Ollama] {error}")
                # Don't retry on 404
                if status == 404:
                    break
            except Exception as e:
                error = f"Unexpected error: {e}"
                print(f"[Ollama] {error}")

        return LLMResponse(success=False, error=error)

    def generate_structured(self, prompt: str, schema: Type[T],
                            system_prompt: str = "") -> T:
        """Generate a response and validate it against a Pydantic schema."""
        schema_json = schema.model_json_schema()
        full_prompt = (
            f"{prompt}\n\n"
            f"IMPORTANT: Respond with ONLY a JSON object that matches this schema. "
            f"Do NOT output the schema definition itself. "
            f"Do NOT include '$defs', 'type', 'properties' keys from the schema. "
            f"Output actual data values.\n\n"
            f"Schema:\n{json.dumps(schema_json, indent=2)}"
        )

        for attempt in range(self.max_retries):
            response = self.generate(full_prompt, system_prompt, format="json")

            if not response.success:
                print(f"[Ollama] Attempt {attempt+1}: LLM call failed: {response.error}")
                continue

            try:
                parsed = json.loads(response.content)
                validated = schema(**parsed)
                return validated
            except json.JSONDecodeError as e:
                error_msg = str(e)[:200]
                print(f"[Ollama] Attempt {attempt+1}: Invalid JSON: {error_msg}")
                full_prompt += f"\n\nYour previous response was invalid JSON. Fix: {error_msg}"
            except Exception as e:
                error_msg = str(e).encode('ascii', errors='replace').decode('ascii')[:200]
                print(f"[Ollama] Attempt {attempt+1}: Schema validation failed: {error_msg}")
                full_prompt += (
                    f"\n\nPrevious attempt failed validation. "
                    f"You must output actual data, not the schema. "
                    f"Error: {error_msg}"
                )

        # Fallback responses
        print(f"[Ollama] All {self.max_retries} attempts failed. Using fallback.")
        return self._get_fallback(schema)

    def chat(self, messages: List[Dict[str, str]],
             system_prompt: str = "") -> LLMResponse:
        """Chat-style multi-turn generation via /api/chat endpoint."""
        formatted_messages = []
        if system_prompt:
            formatted_messages.append({
                "role": "system",
                "content": system_prompt
            })
        formatted_messages.extend(messages)

        payload = {
            "model": self.model,
            "messages": formatted_messages,
            "stream": False,
            "format": "json"
        }

        try:
            resp = requests.post(
                self.chat_endpoint,
                json=payload,
                timeout=self.timeout
            )
            resp.raise_for_status()
            data = resp.json()

            self._total_calls += 1
            tokens = data.get("eval_count", 0) + data.get("prompt_eval_count", 0)
            self._total_tokens_used += tokens

            message = data.get("message", {})
            return LLMResponse(
                content=message.get("content", "{}"),
                model=data.get("model", self.model),
                total_duration_ns=data.get("total_duration", 0),
                prompt_eval_count=data.get("prompt_eval_count", 0),
                eval_count=data.get("eval_count", 0),
                success=True
            )
        except Exception as e:
            return LLMResponse(success=False, error=str(e))

    def _get_fallback(self, schema: Type[T]) -> T:
        """Return a sensible fallback for known schema types."""
        name = schema.__name__

        if name == "TaskGraph":
            return schema(nodes=[
                TaskNode(
                    id="fallback_explore",
                    persona="Explorer",
                    description="Explore the codebase to understand the structure",
                    dependencies=[],
                    token_budget=1000
                ),
                TaskNode(
                    id="fallback_implement",
                    persona="Implementer",
                    description="Implement the requested changes",
                    dependencies=["fallback_explore"],
                    token_budget=2000
                ),
                TaskNode(
                    id="fallback_verify",
                    persona="Verifier",
                    description="Verify the changes work correctly",
                    dependencies=["fallback_implement"],
                    token_budget=1000
                )
            ])
        elif name == "ToolCallRequest":
            return schema(action="complete", parameters={})
        elif name == "RepositoryDNA":
            return schema()

        # Generic fallback
        try:
            return schema()
        except Exception:
            raise ValueError(
                f"Failed to generate valid {name} after "
                f"{self.max_retries} attempts and no fallback available."
            )
