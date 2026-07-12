"""Corre un red-team básico contra el prompt del Copilot de HOTCLICK.

Uso:
    cd security-tools/deepteam
    python -m venv .venv && .venv/Scripts/activate   (Windows)
    pip install -r requirements.txt
    cp .env.example .env   # rellenar NVIDIA_API_KEY con el mismo valor de Hot_click_outlet/.env
    python run_red_team.py

NUNCA apuntar target_callback.py contra tráfico de clientes reales.
"""

from dotenv import load_dotenv

load_dotenv()

from deepteam import red_team
from deepteam.attacks.single_turn import PromptInjection as PromptInjectionAttack
from deepteam.attacks.single_turn import Roleplay
from deepteam.vulnerabilities import Bias, PIILeakage, PromptInjection

from nvidia_nim_model import NvidiaNimModel
from target_callback import model_callback

simulator_model = NvidiaNimModel()
evaluation_model = NvidiaNimModel()

if __name__ == "__main__":
    results = red_team(
        model_callback=model_callback,
        vulnerabilities=[PromptInjection(), Bias(), PIILeakage()],
        attacks=[PromptInjectionAttack(), Roleplay()],
        simulator_model=simulator_model,
        evaluation_model=evaluation_model,
    )
    print(results)
