from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from config import get_key
from routers.profile import get_session, update_session

router = APIRouter(tags=["breaches"])

HIBP_BASE = "https://haveibeenpwned.com/api/v3"
CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"


class ScanRequest(BaseModel):
    scan_id: str


@router.post("/breaches")
async def scan_breaches(body: ScanRequest):
    session = get_session(body.scan_id)
    if not session:
        raise HTTPException(404, "Scan ID not found.")

    api_key = get_key("HIBP_API_KEY")
    if not api_key:
        update_session(body.scan_id, "breach_results", [])
        return {
            "scan_id": body.scan_id,
            "breaches": [],
            "message": "HIBP API key not configured — add it in Settings.",
            "configured": False,
        }

    domain = session["profile"].get("domain", "")
    if not domain:
        return {"scan_id": body.scan_id, "breaches": [], "message": "No domain in profile."}

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(
                f"{HIBP_BASE}/breacheddomain/{domain}",
                headers={
                    "hibp-api-key": api_key,
                    "user-agent": "OstexApex/1.0",
                },
            )

        if r.status_code == 404:
            update_session(body.scan_id, "breach_results", [])
            return {
                "scan_id": body.scan_id,
                "breaches": [],
                "message": f"No breaches found for {domain}",
                "configured": True,
            }

        if r.status_code == 401:
            return {
                "scan_id": body.scan_id,
                "breaches": [],
                "message": "HIBP API key is invalid. Check Settings.",
                "configured": False,
            }

        if r.status_code != 200:
            return {
                "scan_id": body.scan_id,
                "breaches": [],
                "message": f"HIBP returned status {r.status_code}",
                "configured": True,
            }

        raw = r.json()
        # HIBP domain endpoint returns {email: [BreachName, ...], ...}
        # Aggregate unique breach names
        breach_names = set()
        for breaches in raw.values():
            breach_names.update(breaches)

        # Fetch full breach details per breach
        breaches_detail = []
        async with httpx.AsyncClient(timeout=20) as client:
            for name in list(breach_names)[:20]:  # cap at 20
                try:
                    br = await client.get(
                        f"{HIBP_BASE}/breach/{name}",
                        headers={"hibp-api-key": api_key, "user-agent": "OstexApex/1.0"},
                    )
                    if br.status_code == 200:
                        d = br.json()
                        breaches_detail.append({
                            "name": d.get("Name", name),
                            "domain": d.get("Domain", ""),
                            "breach_date": d.get("BreachDate", ""),
                            "compromised_data": d.get("DataClasses", []),
                            "pwn_count": d.get("PwnCount", 0),
                            "description": _strip_html(d.get("Description", ""))[:200],
                        })
                except Exception:
                    breaches_detail.append({
                        "name": name,
                        "domain": domain,
                        "breach_date": "",
                        "compromised_data": [],
                        "pwn_count": 0,
                        "description": "",
                    })

        update_session(body.scan_id, "breach_results", breaches_detail)
        return {
            "scan_id": body.scan_id,
            "breach_count": len(breaches_detail),
            "breaches": breaches_detail,
            "configured": True,
        }

    except Exception as e:
        return {
            "scan_id": body.scan_id,
            "breaches": [],
            "message": f"Error contacting HIBP: {str(e)}",
            "configured": True,
        }


@router.post("/exploited")
async def scan_exploited(body: ScanRequest):
    session = get_session(body.scan_id)
    if not session:
        raise HTTPException(404, "Scan ID not found.")

    cve_results = session.get("cve_results", [])
    cve_ids = {c["cve_id"] for c in cve_results}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(CISA_KEV_URL)
        kev_data = r.json()
        kev_vulns = kev_data.get("vulnerabilities", [])
        kev_ids = {v["cveID"]: v for v in kev_vulns}

        matches = []
        updated_cves = []
        for cve in cve_results:
            if cve["cve_id"] in kev_ids:
                kev = kev_ids[cve["cve_id"]]
                cve["actively_exploited"] = True
                matches.append({
                    "cve_id": cve["cve_id"],
                    "vendor_project": kev.get("vendorProject", ""),
                    "product": kev.get("product", ""),
                    "vulnerability_name": kev.get("vulnerabilityName", ""),
                    "date_added": kev.get("dateAdded", ""),
                    "short_description": kev.get("shortDescription", ""),
                    "required_action": kev.get("requiredAction", ""),
                    "due_date": kev.get("dueDate", ""),
                })
            updated_cves.append(cve)

        update_session(body.scan_id, "cve_results", updated_cves)
        update_session(body.scan_id, "exploited_results", matches)

        return {
            "scan_id": body.scan_id,
            "actively_exploited_count": len(matches),
            "matches": matches,
        }

    except Exception as e:
        return {
            "scan_id": body.scan_id,
            "matches": [],
            "message": f"Could not fetch CISA KEV: {str(e)}",
        }


def _strip_html(text: str) -> str:
    import re
    return re.sub(r"<[^>]+>", "", text)
