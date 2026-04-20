import ssl
import socket
import datetime
import asyncio
from fastapi import APIRouter
from pydantic import BaseModel
import httpx

router = APIRouter(tags=["ssl"])

WEAK_CIPHERS = {"RC4", "DES", "3DES", "MD5", "NULL", "EXPORT", "anon"}


class SSLRequest(BaseModel):
    domain: str


def _clean_domain(domain: str) -> str:
    domain = domain.strip().lower()
    domain = domain.replace("https://", "").replace("http://", "").split("/")[0]
    return domain


def _get_cert_info(domain: str, port: int = 443) -> dict:
    ctx = ssl.create_default_context()
    try:
        with socket.create_connection((domain, port), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                cipher = ssock.cipher()
                version = ssock.version()
                return {"cert": cert, "cipher": cipher, "version": version,
                        "valid": True, "error": None}
    except ssl.SSLCertVerificationError as e:
        # Still grab cert details without verification
        ctx2 = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx2.check_hostname = False
        ctx2.verify_mode = ssl.CERT_NONE
        try:
            with socket.create_connection((domain, port), timeout=10) as sock:
                with ctx2.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    cipher = ssock.cipher()
                    version = ssock.version()
                    return {"cert": cert, "cipher": cipher, "version": version,
                            "valid": False, "error": str(e)}
        except Exception as e2:
            return {"cert": None, "cipher": None, "version": None,
                    "valid": False, "error": str(e2)}
    except Exception as e:
        return {"cert": None, "cipher": None, "version": None,
                "valid": False, "error": str(e)}


def _check_tls_version(domain: str, port: int, tls_version) -> bool:
    try:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ctx.minimum_version = tls_version
        ctx.maximum_version = tls_version
        with socket.create_connection((domain, port), timeout=5) as sock:
            with ctx.wrap_socket(sock, server_hostname=domain):
                return True
    except Exception:
        return False


def _parse_cert(cert: dict) -> dict:
    if not cert:
        return {}

    def flatten(fields):
        return {k: v for item in fields for k, v in item}

    subject = flatten(cert.get("subject", []))
    issuer = flatten(cert.get("issuer", []))

    cn = subject.get("commonName", "")
    issuer_org = issuer.get("organizationName", issuer.get("commonName", "Unknown"))

    sans = [v for t, v in cert.get("subjectAltName", []) if t == "DNS"]

    expiry_str = cert.get("notAfter", "")
    valid_from_str = cert.get("notBefore", "")
    expiry = None
    days_remaining = None
    if expiry_str:
        try:
            expiry = datetime.datetime.strptime(expiry_str, "%b %d %H:%M:%S %Y %Z")
            days_remaining = (expiry - datetime.datetime.utcnow()).days
        except ValueError:
            pass

    is_self_signed = (
        subject.get("commonName") == issuer.get("commonName") and
        subject.get("organizationName", "?") == issuer.get("organizationName", "!")
    )

    return {
        "subject": cn,
        "issuer": issuer_org,
        "valid_from": valid_from_str,
        "valid_until": expiry.strftime("%Y-%m-%d") if expiry else None,
        "days_remaining": days_remaining,
        "sans": sans,
        "is_self_signed": is_self_signed,
    }


def _ssl_checks(domain: str, port: int = 443) -> dict:
    findings = []
    score = 100
    cert_meta = {}

    # ── Certificate info ────────────────────────────────────────────────────
    conn = _get_cert_info(domain, port)
    cert = conn.get("cert")
    cipher_info = conn.get("cipher")  # (name, protocol, bits)
    negotiated_version = conn.get("version")

    if conn["error"] and not cert:
        return {
            "reachable": False,
            "error": conn["error"],
            "findings": [{"check_name": "Connection", "status": "fail",
                          "severity": "Critical",
                          "detail": f"Could not connect to {domain}:443 — {conn['error']}"}],
            "ssl_score": 0,
            "certificate": {},
            "tls_versions": {},
        }

    cert_meta = _parse_cert(cert) if cert else {}

    # 1. Certificate validity
    if not conn["valid"]:
        findings.append({"check_name": "Certificate Validity", "status": "fail",
                         "severity": "Critical",
                         "detail": f"Certificate is INVALID — {conn['error']}"})
        score -= 30
    else:
        findings.append({"check_name": "Certificate Validity", "status": "pass",
                         "severity": "Info",
                         "detail": "Certificate chain is valid and trusted."})

    # 2. Expiry
    days = cert_meta.get("days_remaining")
    if days is not None:
        if days < 0:
            findings.append({"check_name": "Certificate Expiry", "status": "fail",
                             "severity": "Critical",
                             "detail": f"Certificate EXPIRED {abs(days)} days ago."})
            score -= 30
        elif days < 14:
            findings.append({"check_name": "Certificate Expiry", "status": "fail",
                             "severity": "Critical",
                             "detail": f"Expires in {days} days — CRITICAL. Renew immediately."})
            score -= 20
        elif days < 30:
            findings.append({"check_name": "Certificate Expiry", "status": "warning",
                             "severity": "High",
                             "detail": f"Expires in {days} days — renew soon."})
            score -= 10
        else:
            findings.append({"check_name": "Certificate Expiry", "status": "pass",
                             "severity": "Info",
                             "detail": f"Expires {cert_meta.get('valid_until')} ({days} days remaining)."})

    # 3. Issuer
    issuer = cert_meta.get("issuer", "Unknown")
    findings.append({"check_name": "Certificate Issuer", "status": "pass",
                     "severity": "Info",
                     "detail": f"Issued by: {issuer}"})

    # 4. Self-signed
    if cert_meta.get("is_self_signed"):
        findings.append({"check_name": "Certificate Chain", "status": "fail",
                         "severity": "High",
                         "detail": "Self-signed certificate — not trusted by browsers. Use a CA-issued cert."})
        score -= 15
    else:
        sans_str = ", ".join(cert_meta.get("sans", [])[:5]) or cert_meta.get("subject", "")
        findings.append({"check_name": "Certificate Chain", "status": "pass",
                         "severity": "Info",
                         "detail": f"CA-signed. Covers: {sans_str}"})

    # ── TLS versions ─────────────────────────────────────────────────────────
    tls_results = {}
    tls_checks = []

    for label, attr in [
        ("TLS 1.0", "TLSv1"),
        ("TLS 1.1", "TLSv1_1"),
        ("TLS 1.2", "TLSv1_2"),
        ("TLS 1.3", "TLSv1_3"),
    ]:
        try:
            version_enum = getattr(ssl.TLSVersion, attr)
            supported = _check_tls_version(domain, port, version_enum)
        except AttributeError:
            supported = False
        tls_results[label] = supported
        tls_checks.append((label, supported))

    deprecated_tls = [v for v, s in tls_checks if s and v in ("TLS 1.0", "TLS 1.1")]
    modern_tls = [v for v, s in tls_checks if s and v in ("TLS 1.2", "TLS 1.3")]

    if deprecated_tls:
        findings.append({"check_name": "TLS Versions",
                         "status": "fail", "severity": "High",
                         "detail": f"Deprecated protocols enabled: {', '.join(deprecated_tls)}. "
                                   f"Disable immediately — vulnerable to POODLE, BEAST attacks."})
        score -= len(deprecated_tls) * 12
    elif modern_tls:
        tls13 = "TLS 1.3" in modern_tls
        findings.append({"check_name": "TLS Versions", "status": "pass", "severity": "Info",
                         "detail": f"Only modern TLS enabled: {', '.join(modern_tls)}."
                                   + (" TLS 1.3 active — excellent." if tls13 else "")})

    # 7. Cipher suites
    if cipher_info:
        cipher_name = cipher_info[0]
        bits = cipher_info[2]
        weak = [w for w in WEAK_CIPHERS if w.upper() in cipher_name.upper()]
        if weak:
            findings.append({"check_name": "Cipher Suites", "status": "fail",
                             "severity": "Critical",
                             "detail": f"Weak cipher negotiated: {cipher_name}. "
                                       f"Contains: {', '.join(weak)}. Replace immediately."})
            score -= 25
        elif bits and bits < 128:
            findings.append({"check_name": "Cipher Suites", "status": "warning",
                             "severity": "Medium",
                             "detail": f"Weak key length: {cipher_name} ({bits} bits). Use 256-bit ciphers."})
            score -= 10
        else:
            findings.append({"check_name": "Cipher Suites", "status": "pass",
                             "severity": "Info",
                             "detail": f"Negotiated: {cipher_name} ({bits} bits) — acceptable."})

    return {
        "reachable": True,
        "findings": findings,
        "ssl_score": max(0, score),
        "certificate": cert_meta,
        "tls_versions": tls_results,
        "_cipher": cipher_info,
    }


async def _check_headers(domain: str) -> list:
    findings = []
    url = f"https://{domain}"
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True,
                                     verify=False) as client:
            r = await client.get(url)
        headers = {k.lower(): v for k, v in r.headers.items()}

        checks = [
            ("strict-transport-security", "HSTS (Strict-Transport-Security)",
             "Medium", "Enables HSTS — prevents protocol downgrade attacks."),
            ("x-frame-options", "X-Frame-Options",
             "Medium", "Prevents clickjacking attacks."),
            ("x-content-type-options", "X-Content-Type-Options",
             "Low", "Prevents MIME-type sniffing attacks."),
            ("content-security-policy", "Content-Security-Policy",
             "Medium", "Restricts content sources — prevents XSS and data injection."),
            ("x-xss-protection", "X-XSS-Protection",
             "Low", "Legacy XSS filter (deprecated but still checked by scanners)."),
            ("referrer-policy", "Referrer-Policy",
             "Info", "Controls referrer information sent with requests."),
        ]

        score_deductions = {"Medium": 5, "Low": 2, "Info": 0}
        header_score = 0

        for header_key, name, severity, benefit in checks:
            if header_key in headers:
                val = headers[header_key]
                findings.append({"check_name": name, "status": "pass",
                                 "severity": "Info",
                                 "detail": f"Present: {val[:80]}"})
            else:
                findings.append({"check_name": name, "status": "warning",
                                 "severity": severity,
                                 "detail": f"Missing. {benefit}"})
                header_score -= score_deductions.get(severity, 0)

        return findings, header_score

    except Exception as e:
        findings.append({"check_name": "HTTP Headers", "status": "warning",
                        "severity": "Info",
                        "detail": f"Could not fetch headers: {str(e)}"})
        return findings, 0


async def _check_https_redirect(domain: str) -> tuple[dict, int]:
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            r = await client.get(f"http://{domain}")
        if r.status_code in (301, 302, 307, 308):
            location = r.headers.get("location", "")
            if location.startswith("https://"):
                return ({"check_name": "HTTP→HTTPS Redirect", "status": "pass",
                         "severity": "Info",
                         "detail": f"HTTP correctly redirects to HTTPS (HTTP {r.status_code})."}, 0)
        return ({"check_name": "HTTP→HTTPS Redirect", "status": "fail",
                 "severity": "Medium",
                 "detail": "HTTP does not redirect to HTTPS. Users on HTTP are unprotected."}, -5)
    except Exception as e:
        return ({"check_name": "HTTP→HTTPS Redirect", "status": "warning",
                 "severity": "Info",
                 "detail": f"Could not check redirect: {str(e)}"}, 0)


@router.post("/ssl")
async def scan_ssl(body: SSLRequest):
    domain = _clean_domain(body.domain)
    if not domain:
        return {"error": "Invalid domain", "findings": [], "ssl_score": 0}

    # Run blocking SSL checks in thread pool
    ssl_data = await asyncio.to_thread(_ssl_checks, domain)

    if not ssl_data.get("reachable"):
        return ssl_data

    # Async: headers + redirect check
    header_findings, header_score = await _check_headers(domain)
    redirect_finding, redirect_score = await _check_https_redirect(domain)

    all_findings = ssl_data["findings"] + header_findings + [redirect_finding]
    final_score = max(0, ssl_data["ssl_score"] + header_score + redirect_score)

    return {
        "domain": domain,
        "reachable": True,
        "ssl_score": final_score,
        "findings": all_findings,
        "certificate": ssl_data.get("certificate", {}),
        "tls_versions": ssl_data.get("tls_versions", {}),
    }
