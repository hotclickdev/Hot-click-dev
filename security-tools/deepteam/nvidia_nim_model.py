"""DeepEvalBaseLLM custom que usa NVIDIA NIM en vez de OpenAI GPT.

DeepTeam/deepeval usan este modelo tanto para SIMULAR ataques (generar los
prompts adversariales) como para EVALUARLOS (juez de si el ataque tuvo éxito).
Reutiliza NVIDIA_API_KEY/NVIDIA_MODEL — las mismas variables que ya usa
Hot_click_outlet/.env para AiCopilotService.java — sin crear una key nueva.
"""

import os

from deepeval.models.base_model import DeepEvalBaseLLM
from openai import OpenAI


class NvidiaNimModel(DeepEvalBaseLLM):
    def __init__(self):
        self.client = OpenAI(
            api_key=os.environ["NVIDIA_API_KEY"],
            base_url=os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
        )
        self.model_name = os.environ.get("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

    def load_model(self):
        return self.client

    def generate(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
        )
        return response.choices[0].message.content

    async def a_generate(self, prompt: str) -> str:
        return self.generate(prompt)

    def get_model_name(self) -> str:
        return f"nvidia-nim/{self.model_name}"
