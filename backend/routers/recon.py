import asyncio
import re
import socket

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from routers.profile import get_session, update_session

router = APIRouter(tags=["recon"])

# ── Port definitions ────────────────────────────────────────────────────────

COMMON_PORTS: dict[int, str] = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    143: "IMAP",
    443: "HTTPS",
    445: "SMB",
    587: "SMTP-TLS",
    993: "IMAP-SSL",
    995: "POP3-SSL",
    1433: "SQL Server",
    1521: "Oracle DB",
    2049: "NFS",
    2181: "ZooKeeper",
    3306: "MySQL",
    3389: "RDP",
    5432: "PostgreSQL",
    5672: "RabbitMQ",
    5900: "VNC",
    6379: "Redis",
    7001: "WebLogic",
    8080: "HTTP-Alt",
    8443: "HTTPS-Alt",
    8888: "Dev Server",
    9200: "Elasticsearch",
    9300: "Elasticsearch-Cluster",
    11211: "Memcached",
    15672: "RabbitMQ-UI",
    27017: "MongoDB",
    28017: "MongoDB-Web",
}

# When these ports are open → add corresponding software to CVE scan
PORT_TO_CVE_SOFTWARE: dict[int, str] = {
    3306: "MySQL",
    5432: "PostgreSQL",
    6379: "Redis",
    27017: "MongoDB",
    1433: "SQL Server",
    11211: "Memcached",
    9200: "Elasticsearch",
    1521: "Oracle",
    3389: "Windows Server",
}

# Ports that are risky when exposed publicly
DANGER_PORTS: set[int] = {23, 445, 3306, 3389, 5432, 5900, 6379, 9200, 11211, 27017, 28017}


# ── Port scanning ────────────────────────────────────────────────────────────

async def _check_port(host: str, port: int, timeout: float = 2.0) -> bool:
    try:
        _, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port), timeout=timeout
        )
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return True
    except Exception:
        return False


async def _scan_ports(host: str) -> dict[int, str]:
    sem = asyncio.Semaphore(30)

    async def bounded(port: int, svc: str):
        async with sem:
            ok = await _check_port(host, port)
            return port, svc, ok

    results = await asyncio.gather(
        *[bounded(p, s) for p, s in COMMON_PORTS.items()],
        return_exceptions=True,
    )
    return {
        port: svc
        for r in results
        if not isinstance(r, Exception)
        for port, svc, ok in [r]
        if ok
    }


# ── HTTP fingerprinting ───────────────────────────────────────────────────────

def _ver(text: str, pattern: str) -> str | None:
    m = re.search(pattern, text, re.IGNORECASE)
    return m.group(1) if m else None


async def _fingerprint_http(domain: str) -> tuple[dict[str, str | None], str | None]:
    """
    Returns (detected_software_dict, raw_server_banner).
    detected_software_dict maps software name → version string or None.
    """
    found: dict[str, str | None] = {}
    banner: str | None = None

    for scheme in ("https", "http"):
        try:
            async with httpx.AsyncClient(
                verify=False,
                timeout=12,
                follow_redirects=True,
                headers={"User-Agent": "OstexApex/1.0 (security-audit)"},
            ) as client:
                r = await client.get(f"{scheme}://{domain}/")
                h = dict(r.headers)
                body = r.text[:60_000]

                # Server banner
                server = h.get("server", "")
                if server:
                    banner = server
                    sl = server.lower()
                    if "apache" in sl:
                        found["Apache"] = _ver(server, r"Apache[\s/]+([\d.]+[\w.]*)")
                    if "nginx" in sl:
                        found["Nginx"] = _ver(server, r"nginx[\s/]+([\d.]+)")
                    if "iis" in sl or "microsoft-iis" in sl:
                        found["IIS"] = _ver(server, r"IIS[\s/]+([\d.]+)")
                    if "litespeed" in sl:
                        found["LiteSpeed"] = None
                    if "cpanel" in sl:
                        found["cPanel"] = None
                    v = _ver(server, r"OpenSSL[\s/]+([\d.]+[a-z]*)")
                    if v:
                        found["OpenSSL"] = v

                # X-Powered-By
                powered = h.get("x-powered-by", "")
                if powered:
                    v = _ver(powered, r"PHP[\s/]+([\d.]+)")
                    if v or "php" in powered.lower():
                        found["PHP"] = v
                    if "asp.net" in powered.lower():
                        found["Windows Server"] = None
                    if "express" in powered.lower():
                        found["Node.js"] = None

                # X-Generator header
                gen = h.get("x-generator", "")
                if "wordpress" in gen.lower():
                    found["WordPress"] = _ver(gen, r"WordPress ([\d.]+)")

                # WordPress signals in body
                if "WordPress" not in found and (
                    "/wp-content/" in body or "/wp-includes/" in body or "wp-json" in body
                ):
                    found["WordPress"] = _ver(
                        body, r'<meta[^>]+content="WordPress ([\d.]+)"'
                    )

                # Joomla
                if "/media/jui/" in body or "/media/system/js/" in body:
                    found["Joomla"] = None

                # Drupal
                if "/sites/default/files/" in body or (
                    "drupal" in body.lower() and "Drupal" not in found
                ):
                    found["Drupal"] = None

                # Cookie-based hints
                cookies = h.get("set-cookie", "").lower()
                if "csrftoken" in cookies and "PHP" not in found:
                    found["Python"] = None
                if "laravel_session" in cookies and "PHP" not in found:
                    found["PHP"] = None
                if "rack.session" in cookies:
                    found["Ruby"] = None

                break  # got a valid response — skip the other scheme

        except Exception:
            continue

    return found, banner


# ── Endpoint ──────────────────────────────────────────────────────────────────

class ReconRequest(BaseModel):
    scan_id: str


@router.post("/recon")
async def run_recon(body: ReconRequest):
    session = get_session(body.scan_id)
    if not session:
        raise HTTPException(404, "Scan ID not found.")

    domain = session["profile"].get("domain", "").strip()
    if not domain:
        raise HTTPException(400, "No domain in profile.")

    # Resolve hostname
    try:
        ip = await asyncio.to_thread(socket.gethostbyname, domain)
    except socket.gaierror:
        update_session(body.scan_id, "discovered_software", {})
        update_session(body.scan_id, "open_ports", {})
        return {
            "scan_id": body.scan_id,
            "error": f"Cannot resolve hostname: {domain}",
            "ip": None,
            "open_ports": {},
            "discovered_software": {},
            "web_server_banner": None,
        }

    # Run port scan + HTTP fingerprinting concurrently
    open_ports, (http_sw, http_banner) = await asyncio.gather(
        _scan_ports(ip),
        _fingerprint_http(domain),
    )

    # Build discovered_software: HTTP fingerprint + port-inferred software
    discovered: dict[str, str | None] = dict(http_sw)
    for port, sw in PORT_TO_CVE_SOFTWARE.items():
        if port in open_ports and sw not in discovered:
            discovered[sw] = None  # version unknown from port alone

    # Annotate open ports with danger flag
    annotated_ports = {
        port: {
            "service": svc,
            "danger": port in DANGER_PORTS,
        }
        for port, svc in open_ports.items()
    }

    update_session(body.scan_id, "discovered_software", discovered)
    update_session(body.scan_id, "open_ports", annotated_ports)

    return {
        "scan_id": body.scan_id,
        "ip": ip,
        "open_ports": annotated_ports,
        "discovered_software": discovered,
        "web_server_banner": http_banner,
    }
