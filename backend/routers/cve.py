import asyncio
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from config import get_key
from routers.profile import get_session, update_session

router = APIRouter(tags=["cve"])

NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0"

# Without an API key: 5 req / 30s → 1 req/6s to stay safe
# With an API key:   50 req / 30s → no meaningful delay needed
DELAY_NO_KEY = 6.0
DELAY_WITH_KEY = 0.6

# Severities to fetch per software item
# When version provided: get all (the version keyword already narrows results)
# When no version: only CRITICAL + HIGH (avoids noise from old medium/low CVEs)
SEVERITIES_WITH_VERSION = [None]          # None = no severity filter = all
SEVERITIES_WITHOUT_VERSION = ["CRITICAL", "HIGH"]


class ScanRequest(BaseModel):
    scan_id: str


def _severity(score: float | None) -> str:
    if score is None:
        return "Unknown"
    if score >= 9.0:
        return "Critical"
    if score >= 7.0:
        return "High"
    if score >= 4.0:
        return "Medium"
    return "Low"


def _parse_cve(item: dict) -> dict:
    cve = item.get("cve", {})
    cve_id = cve.get("id", "")
    descriptions = cve.get("descriptions", [])
    desc = next((d["value"] for d in descriptions if d.get("lang") == "en"), "No description available")

    metrics = cve.get("metrics", {})
    cvss_score = None
    attack_vector = "Unknown"

    for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        entries = metrics.get(key, [])
        if entries:
            data = entries[0].get("cvssData", {})
            cvss_score = data.get("baseScore")
            attack_vector = data.get("attackVector", data.get("accessVector", "Unknown"))
            break

    published = cve.get("published", "")[:10]

    refs = cve.get("references", [])
    patch_tags = {"Patch", "Vendor Advisory", "Mitigation"}
    patch_available = any(
        tag in r.get("tags", []) for r in refs for tag in patch_tags
    )

    return {
        "cve_id": cve_id,
        "description": desc[:300],
        "cvss_score": cvss_score,
        "severity": _severity(cvss_score),
        "attack_vector": attack_vector,
        "patch_available": patch_available,
        "published_date": published,
        "actively_exploited": False,
    }


@router.post("/cve")
async def scan_cve(body: ScanRequest):
    session = get_session(body.scan_id)
    if not session:
        raise HTTPException(404, "Scan ID not found. Submit /api/profile first.")

    profile = session["profile"]
    declared_software: list = profile.get("software", [])
    declared_versions: dict = profile.get("software_versions", {})

    # Merge auto-discovered software from the recon step
    discovered: dict = session.get("discovered_software", {})

    # Build unified list: declared first, then any newly discovered additions
    seen_sw: set[str] = set(declared_software)
    software_list = list(declared_software)
    for sw in discovered:
        if sw not in seen_sw:
            software_list.append(sw)
            seen_sw.add(sw)

    # Versions: prefer user-provided, fall back to discovered
    software_versions: dict = {}
    for sw in software_list:
        if sw in declared_versions and declared_versions[sw].strip():
            software_versions[sw] = declared_versions[sw].strip()
        elif sw in discovered and discovered[sw]:
            software_versions[sw] = discovered[sw]
        else:
            software_versions[sw] = ""

    api_key = get_key("NVD_API_KEY")
    headers = {"apiKey": api_key} if api_key else {}
    delay = DELAY_WITH_KEY if api_key else DELAY_NO_KEY

    seen_ids: set[str] = set()
    all_cves = []
    errors = []
    request_count = 0
    timed_out = False
    deadline = time.monotonic() + 20  # stay under Vercel's 30s proxy timeout

    async with httpx.AsyncClient(timeout=15) as client:
        for sw in software_list:
            if timed_out:
                break
            version = software_versions.get(sw, "").strip()
            keyword = f"{sw} {version}".strip() if version else sw
            severities = SEVERITIES_WITH_VERSION if version else SEVERITIES_WITHOUT_VERSION

            for severity_filter in severities:
                # Rate-limit courtesy delay
                if request_count > 0:
                    if time.monotonic() + delay > deadline:
                        errors.append(
                            "CVE scan time limit reached — add an NVD API key in Settings for complete results"
                        )
                        timed_out = True
                        break
                    await asyncio.sleep(delay)
                request_count += 1

                params = {"keywordSearch": keyword, "resultsPerPage": 20}
                if severity_filter:
                    params["cvssV3Severity"] = severity_filter

                try:
                    r = await client.get(NVD_BASE, params=params, headers=headers)

                    if r.status_code == 200:
                        items = r.json().get("vulnerabilities", [])
                        for item in items:
                            parsed = _parse_cve(item)
                            cve_id = parsed["cve_id"]
                            if cve_id in seen_ids:
                                continue
                            seen_ids.add(cve_id)
                            parsed["software"] = sw
                            parsed["version_queried"] = version or None
                            parsed["source"] = (
                                "discovered" if sw in discovered and sw not in declared_software
                                else "declared"
                            )
                            all_cves.append(parsed)

                    elif r.status_code == 403:
                        errors.append(
                            f"{sw}: NVD rate limit hit — add an NVD API key in Settings for higher limits"
                        )
                        # Back off on rate limit
                        await asyncio.sleep(30)

                    else:
                        errors.append(f"{sw}: NVD returned {r.status_code}")

                except Exception as e:
                    errors.append(f"{sw}: {str(e)}")

    # Sort: Critical first, then by CVSS score descending
    severity_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3, "Unknown": 4}
    all_cves.sort(
        key=lambda c: (severity_order.get(c["severity"], 4), -(c["cvss_score"] or 0))
    )

    update_session(body.scan_id, "cve_results", all_cves)
    return {
        "scan_id": body.scan_id,
        "cve_count": len(all_cves),
        "cves": all_cves,
        "errors": errors,
    }
