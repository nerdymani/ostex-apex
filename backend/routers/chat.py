import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any
from config import get_key
from utils.ai import ai_stream

router = APIRouter(tags=["chat"])

SYSTEM_PROMPT = """You are Apex, an expert cybersecurity analyst for Ostex — a Tanzanian cybersecurity company. You have just completed a threat intelligence scan for an organization. You have full context of their scan results including CVEs found, breach data, CISA active exploits, and their risk score. Answer the user's security questions directly and practically. When relevant, reference the specific CVEs or findings from their scan. Give concrete actionable advice. Be conversational but precise. If asked in Swahili, respond in Swahili."""


class ChatRequest(BaseModel):
    message: str
    scan_context: Any = None


@router.post("/chat")
async def chat(body: ChatRequest):
    if not get_key("GROQ_API_KEY"):
        raise HTTPException(503, "Groq API key not configured. Add it in Settings → console.groq.com")

    context_block = ""
    if body.scan_context:
        ctx = body.scan_context
        profile = ctx.get("profile", {})
        cves = ctx.get("cves", [])
        breaches = ctx.get("breaches", [])
        exploited = ctx.get("exploited", [])
        analysis = ctx.get("analysis") or {}

        critical = [c for c in cves if c.get("severity") == "Critical"]
        high = [c for c in cves if c.get("severity") == "High"]

        context_block = f"""
=== SCAN CONTEXT ===
Organization: {profile.get('org_name', 'Unknown')}
Domain: {profile.get('domain', 'Unknown')}
Software Stack: {', '.join(profile.get('software', []))}
Employee Range: {profile.get('employee_range', 'Unknown')}

Risk Score: {analysis.get('risk_score', 'N/A')}/100
Risk Level: {analysis.get('risk_level', 'Unknown')}

CVEs Found: {len(cves)} total | {len(critical)} Critical | {len(high)} High
Actively Exploited (CISA KEV): {len(exploited)}
Breaches: {len(breaches)}

Top Critical CVEs:
{json.dumps(critical[:5], indent=2) if critical else 'None'}

Active Exploits:
{json.dumps(exploited[:3], indent=2) if exploited else 'None'}

AI Risk Summary: {analysis.get('executive_summary_english', 'Not available')}
===================
"""

    user_message = f"{context_block}\nUser question: {body.message}"

    async def generate():
        try:
            async for token in ai_stream(user_message, SYSTEM_PROMPT):
                yield f"data: {json.dumps({'content': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
