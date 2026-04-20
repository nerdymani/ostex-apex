import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from config import get_key
from routers.profile import get_session, update_session
from utils.ai import ai_generate_json

router = APIRouter(tags=["analyse"])

_remediation_cache: dict = {}

ANALYSIS_FALLBACK = {
    "risk_score": 50,
    "risk_level": "Medium",
    "business_impact": "AI analysis temporarily unavailable. Please review findings manually.",
    "top_5_actions": [
        "Review critical CVEs immediately",
        "Check breach data",
        "Update all software",
        "Enable security headers",
        "Contact support",
    ],
    "executive_summary_english": "Analysis unavailable — please review the raw findings above.",
    "executive_summary_swahili": "Uchambuzi haupatikani — tafadhali kagua matokeo hapo juu.",
    "tanzanian_regulatory_note": "Consult your IT team regarding TCRA compliance requirements.",
}

SYSTEM_PROMPT = """You are a senior cybersecurity analyst specializing in African markets. Given threat intelligence data for a Tanzanian organization, analyze the risk and respond ONLY in this exact JSON format with no additional text:
{
  "risk_score": <number 0-100>,
  "risk_level": "<Critical|High|Medium|Low>",
  "business_impact": "<2-3 sentences>",
  "top_5_actions": ["<action 1>", "<action 2>", "<action 3>", "<action 4>", "<action 5>"],
  "executive_summary_english": "<short paragraph>",
  "executive_summary_swahili": "<short paragraph in Kiswahili>",
  "tanzanian_regulatory_note": "<TCRA or data protection implications>"
}"""

REMEDIATION_SYSTEM_PROMPT = """You are a senior Linux/Windows systems administrator and security engineer. Given a specific CVE and affected software, provide the exact remediation steps with real commands, configuration snippets, or code. Be specific — no vague advice. Format your response as JSON with these exact fields and no additional text:
{
  "immediate_action": "<one sentence — what to do RIGHT NOW>",
  "commands": [
    {"os": "Ubuntu/Debian", "command": "<exact shell command>", "description": "<what it does>"},
    {"os": "CentOS/RHEL", "command": "<exact shell command>", "description": "<what it does>"},
    {"os": "Windows Server", "command": "<exact command>", "description": "<what it does>"}
  ],
  "config_changes": [
    {"file": "<path/to/file>", "before": "<old config lines>", "after": "<new config lines>", "description": "<what changes>"}
  ],
  "verification": "<command or step to verify the fix worked>",
  "estimated_time": "<e.g. 15 minutes>",
  "requires_restart": <true|false>,
  "references": [
    {"title": "<title>", "url": "<url>"}
  ]
}
If the fix requires a software update, include the exact package manager command. If it requires a config change, show before and after."""


def _json_prompt_suffix() -> str:
    return "\n\nReturn ONLY a valid JSON object. No markdown, no code fences, no explanation before or after. Start your response with { and end with }"


class AnalyseRequest(BaseModel):
    scan_id: str


@router.post("/analyse")
async def analyse(body: AnalyseRequest):
    session = get_session(body.scan_id)
    if not session:
        raise HTTPException(404, "Scan ID not found.")

    if not get_key("GROQ_API_KEY"):
        raise HTTPException(503, "Groq API key not configured. Add it in Settings → console.groq.com")

    profile = session.get("profile", {})
    cves = session.get("cve_results", [])
    breaches = session.get("breach_results", [])
    exploited = session.get("exploited_results", [])

    critical_cves = [c for c in cves if c.get("severity") == "Critical"]
    high_cves = [c for c in cves if c.get("severity") == "High"]

    user_message = f"""Organization: {profile.get('org_name', 'Unknown')}
Domain: {profile.get('domain', 'Unknown')}
Software Stack: {', '.join(profile.get('software', []))}
Employee Range: {profile.get('employee_range', 'Unknown')}

CVE Summary:
- Total CVEs found: {len(cves)}
- Critical: {len(critical_cves)}
- High: {len(high_cves)}
- Actively exploited (CISA KEV): {len(exploited)}

Top Critical CVEs:
{json.dumps(critical_cves[:5], indent=2)}

Breach Intelligence:
- Breaches found: {len(breaches)}
{json.dumps(breaches[:5], indent=2) if breaches else "None"}

Actively Exploited Vulnerabilities:
{json.dumps(exploited[:5], indent=2) if exploited else "None"}

Provide a comprehensive risk analysis for this Tanzanian organization.{_json_prompt_suffix()}"""

    try:
        analysis = await ai_generate_json(user_message, SYSTEM_PROMPT)
    except Exception:
        retry_message = user_message + "\n\nIMPORTANT: Your entire response must be a single JSON object and nothing else. Begin immediately with { and end with }. Do not write any words before or after the JSON."
        try:
            analysis = await ai_generate_json(retry_message, SYSTEM_PROMPT)
        except Exception:
            analysis = ANALYSIS_FALLBACK

    update_session(body.scan_id, "analysis", analysis)
    return {"scan_id": body.scan_id, "analysis": analysis}


class RemediateRequest(BaseModel):
    cve_id: str
    cve_description: str
    affected_software: str
    severity: str


@router.post("/remediate")
async def remediate(body: RemediateRequest):
    if body.cve_id in _remediation_cache:
        return {"cve_id": body.cve_id, "remediation": _remediation_cache[body.cve_id], "cached": True}

    if not get_key("GROQ_API_KEY"):
        raise HTTPException(503, "Groq API key not configured. Add it in Settings → console.groq.com")

    user_message = f"""CVE ID: {body.cve_id}
Severity: {body.severity}
Affected Software: {body.affected_software}
Description: {body.cve_description}

Provide exact remediation steps with real commands.{_json_prompt_suffix()}"""

    remediation_fallback = {
        "immediate_action": f"Patch or mitigate {body.cve_id} immediately — severity is {body.severity}.",
        "commands": [
            {"os": "Ubuntu/Debian", "command": "apt-get update && apt-get upgrade -y", "description": "Update all packages"},
            {"os": "CentOS/RHEL", "command": "yum update -y", "description": "Update all packages"},
            {"os": "Windows Server", "command": "Get-WindowsUpdate -Install -AcceptAll", "description": "Install all updates"},
        ],
        "config_changes": [],
        "verification": "Check vendor advisory for specific verification steps.",
        "estimated_time": "30 minutes",
        "requires_restart": False,
        "references": [{"title": f"NVD — {body.cve_id}", "url": f"https://nvd.nist.gov/vuln/detail/{body.cve_id}"}],
    }

    try:
        remediation = await ai_generate_json(user_message, REMEDIATION_SYSTEM_PROMPT)
    except Exception:
        retry_message = user_message + "\n\nIMPORTANT: Your entire response must be a single JSON object. Begin with { and end with }."
        try:
            remediation = await ai_generate_json(retry_message, REMEDIATION_SYSTEM_PROMPT)
        except Exception:
            remediation = remediation_fallback

    _remediation_cache[body.cve_id] = remediation
    return {"cve_id": body.cve_id, "remediation": remediation, "cached": False}
