import json
import requests
from typing import Type, TypeVar, Any, Dict
from pydantic import BaseModel

T = TypeVar('T', bound=BaseModel)

class LLMClient:
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3"):
        self.base_url = base_url
        self.model = model
        self.generate_endpoint = f"{self.base_url}/api/generate"
        self.chat_endpoint = f"{self.base_url}/api/chat"

    def _call_ollama(self, prompt: str, system_prompt: str = "") -> str:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "format": "json"  # Enforce JSON output in Ollama
        }
        
        try:
            response = requests.post(self.generate_endpoint, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "{}")
        except requests.exceptions.RequestException as e:
            print(f"Error calling Ollama API: {e}")
            return "{}"

    def get_structured_output(self, prompt: str, schema: Type[T], system_prompt: str = "") -> T:
        """
        Forces the LLM to output according to the provided Pydantic schema.
        We append the JSON schema to the prompt to guide the model.
        """
        schema_json = schema.model_json_schema()
        full_prompt = f"{prompt}\n\nIMPORTANT: You must respond with a single JSON data object that provides values for the fields defined in this schema. DO NOT output the schema itself. DO NOT output properties like '$defs' or 'type'.\n\nSchema definition:\n{json.dumps(schema_json)}"
        
        # We might need multiple retries if the model fails to produce valid JSON
        max_retries = 3
        for attempt in range(max_retries):
            raw_response = self._call_ollama(full_prompt, system_prompt)
            try:
                # Attempt to parse the raw response string as JSON
                parsed_json = json.loads(raw_response)
                # Validate against the Pydantic schema
                validated_data = schema(**parsed_json)
                return validated_data
            except (json.JSONDecodeError, ValueError) as e:
                error_msg = str(e).encode('ascii', errors='replace').decode('ascii')
                print(f"Attempt {attempt + 1}: Failed to parse JSON or validate schema: {error_msg}")
                full_prompt += f"\n\nPrevious attempt failed. You must output the actual data object, not the schema. Fix this error: {error_msg}"
        
        print("Warning: Failed to generate valid output. Using mock fallback.")
        if schema.__name__ == "TaskGraph":
            return schema(nodes=[
                {"id": "mock_task_1", "persona": "Explorer", "description": "Explore the codebase", "dependencies": [], "token_budget": 1000}
            ])
        elif schema.__name__ == "ToolCallRequest":
            return schema(action="complete", parameters={})
        
        try:
            return schema()
        except:
            raise ValueError("Failed to generate valid structured output after multiple attempts and fallback failed.")
