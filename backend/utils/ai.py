import json
from groq import AsyncGroq
from config import get_key

MODEL = "llama-3.3-70b-versatile"


def _require_key() -> str:
    key = get_key("GROQ_API_KEY")
    if not key:
        raise ValueError("GROQ_API_KEY not configured. Add it in Settings.")
    return key


async def ai_generate(prompt: str, system: str = "") -> str:
    key = _require_key()
    client = AsyncGroq(api_key=key)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    completion = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=1500,
    )
    return completion.choices[0].message.content or ""


async def ai_generate_json(prompt: str, system: str = "") -> dict:
    raw = await ai_generate(prompt, system)
    cleaned = raw.strip()
    # Strip markdown fences
    if cleaned.startswith("```"):
        parts = cleaned.split("```")
        if len(parts) >= 2:
            cleaned = parts[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
    cleaned = cleaned.strip()
    # Trim to first { ... last }
    start = cleaned.find("{")
    end = cleaned.rfind("}") + 1
    if start != -1 and end > start:
        cleaned = cleaned[start:end]
    return json.loads(cleaned)


async def ai_stream(prompt: str, system: str = ""):
    key = _require_key()
    client = AsyncGroq(api_key=key)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    stream = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.5,
        max_tokens=1000,
        stream=True,
    )
    async for chunk in stream:
        content = chunk.choices[0].delta.content or ""
        if content:
            yield content
