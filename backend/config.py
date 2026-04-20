import json
import os
from pathlib import Path

CONFIG_PATH = Path(__file__).parent / "config.json"

DEFAULT_CONFIG = {
    "GROQ_API_KEY": "",
    "HIBP_API_KEY": "",
    "NVD_API_KEY": "",
}


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        CONFIG_PATH.write_text(json.dumps(DEFAULT_CONFIG, indent=2))
        return DEFAULT_CONFIG.copy()
    try:
        data = json.loads(CONFIG_PATH.read_text())
        # Migrate: add GROQ_API_KEY if missing (e.g. coming from Ollama config)
        if "GROQ_API_KEY" not in data:
            data["GROQ_API_KEY"] = ""
        return data
    except (json.JSONDecodeError, OSError):
        return DEFAULT_CONFIG.copy()


def save_config(data: dict) -> None:
    current = load_config()
    current.update({k: v for k, v in data.items() if v is not None})
    CONFIG_PATH.write_text(json.dumps(current, indent=2))


def get_key(name: str) -> str:
    # Environment variables take priority (e.g. Railway / Render deployments)
    value = os.environ.get(name) or load_config().get(name, "")
    return value.strip() if value else ""


def mask_key(value: str) -> str:
    if not value or len(value) < 4:
        return ""
    return f"...{value[-4:]}"
