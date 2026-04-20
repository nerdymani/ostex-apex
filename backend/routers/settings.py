from fastapi import APIRouter
import httpx
from pydantic import BaseModel
from typing import Optional
from config import load_config, save_config, mask_key, get_key

router = APIRouter(tags=["settings"])


class SettingsPayload(BaseModel):
    GROQ_API_KEY: Optional[str] = None
    HIBP_API_KEY: Optional[str] = None
    NVD_API_KEY: Optional[str] = None


@router.get("/settings")
def get_settings():
    cfg = load_config()
    return {
        "GROQ_API_KEY": mask_key(cfg.get("GROQ_API_KEY", "")),
        "HIBP_API_KEY": mask_key(cfg.get("HIBP_API_KEY", "")),
        "NVD_API_KEY": mask_key(cfg.get("NVD_API_KEY", "")),
        "groq_configured": bool(cfg.get("GROQ_API_KEY")),
        "hibp_configured": bool(cfg.get("HIBP_API_KEY")),
        "nvd_configured": bool(cfg.get("NVD_API_KEY")),
    }


@router.post("/settings")
def update_settings(payload: SettingsPayload):
    data = {}
    if payload.GROQ_API_KEY is not None:
        data["GROQ_API_KEY"] = payload.GROQ_API_KEY
    if payload.HIBP_API_KEY is not None:
        data["HIBP_API_KEY"] = payload.HIBP_API_KEY
    if payload.NVD_API_KEY is not None:
        data["NVD_API_KEY"] = payload.NVD_API_KEY
    save_config(data)
    return {"status": "saved"}


@router.get("/settings/test-groq")
async def test_groq():
    key = get_key("GROQ_API_KEY")
    if not key:
        return {"status": "error", "message": "GROQ_API_KEY not configured."}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": "Reply with one word: ready"}],
                    "temperature": 0.1,
                    "max_tokens": 10,
                },
            )
            r.raise_for_status()
            reply = r.json()["choices"][0]["message"]["content"].strip()
            return {"status": "ok", "response": reply, "model": "llama-3.3-70b-versatile"}
    except httpx.TimeoutException:
        return {"status": "error", "message": "Groq API timed out after 10 seconds."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/settings/test/{key_name}")
async def test_key(key_name: str):
    value = get_key(key_name)
    if not value:
        return {"ok": False, "message": f"{key_name} not configured"}

    try:
        if key_name == "HIBP_API_KEY":
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "https://haveibeenpwned.com/api/v3/breacheddomain/example.com",
                    headers={"hibp-api-key": value, "user-agent": "OstexApex/1.0"},
                )
            if r.status_code in (200, 404):
                return {"ok": True, "message": "HIBP API key is valid"}
            return {"ok": False, "message": f"HIBP returned {r.status_code}"}

        elif key_name == "NVD_API_KEY":
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=test&resultsPerPage=1",
                    headers={"apiKey": value},
                )
            if r.status_code == 200:
                return {"ok": True, "message": "NVD API key is valid"}
            return {"ok": False, "message": f"NVD returned {r.status_code}"}

        return {"ok": False, "message": "Unknown key name"}
    except Exception as e:
        return {"ok": False, "message": str(e)}
