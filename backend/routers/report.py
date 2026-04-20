import io
import re
import html as _html
from datetime import date
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from routers.profile import get_session

router = APIRouter(tags=["report"])


def _safe(text) -> str:
    """Escape XML special chars so ReportLab Paragraph doesn't crash."""
    return _html.escape(str(text or ""))


def _strip_html(text) -> str:
    """Strip HTML tags (e.g. from HIBP descriptions) then escape for ReportLab."""
    cleaned = re.sub(r"<[^>]+>", " ", str(text or ""))
    return _html.escape(cleaned)


# Brand colors
DARK_NAVY = colors.HexColor("#0f172a")
GREEN = colors.HexColor("#10b981")
AMBER = colors.HexColor("#f59e0b")
RED = colors.HexColor("#ef4444")
ORANGE = colors.HexColor("#f97316")
YELLOW = colors.HexColor("#eab308")
BLUE = colors.HexColor("#3b82f6")
LIGHT_GREY = colors.HexColor("#e2e8f0")
MID_GREY = colors.HexColor("#64748b")
WHITE = colors.white


class ReportRequest(BaseModel):
    scan_id: str


def _severity_color(severity: str) -> colors.Color:
    return {
        "Critical": RED,
        "High": ORANGE,
        "Medium": YELLOW,
        "Low": BLUE,
    }.get(severity, MID_GREY)


def _risk_color(level: str) -> colors.Color:
    return {"Critical": RED, "High": ORANGE, "Medium": AMBER, "Low": GREEN}.get(level, GREEN)


@router.post("/report")
async def generate_report(body: ReportRequest):
    session = get_session(body.scan_id)
    if not session:
        raise HTTPException(404, "Scan ID not found.")

    profile = session.get("profile", {})
    cves = session.get("cve_results", [])
    breaches = session.get("breach_results", [])
    exploited = session.get("exploited_results", [])
    analysis = session.get("analysis") or {}

    org_name = profile.get("org_name", "Unknown Organization")
    domain = profile.get("domain", "")
    software = profile.get("software", [])
    scan_date = date.today().strftime("%B %d, %Y")

    risk_score = analysis.get("risk_score", "N/A")
    risk_level = analysis.get("risk_level", "Unknown")
    risk_color = _risk_color(risk_level)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", fontSize=32, textColor=WHITE, alignment=TA_CENTER,
                                 fontName="Helvetica-Bold", spaceAfter=8)
    subtitle_style = ParagraphStyle("subtitle", fontSize=14, textColor=GREEN, alignment=TA_CENTER,
                                    fontName="Helvetica", spaceAfter=4)
    heading_style = ParagraphStyle("heading", fontSize=16, textColor=DARK_NAVY, fontName="Helvetica-Bold",
                                   spaceBefore=12, spaceAfter=6)
    body_style = ParagraphStyle("body", fontSize=10, textColor=colors.HexColor("#1e293b"),
                                fontName="Helvetica", leading=14, spaceAfter=6)
    small_style = ParagraphStyle("small", fontSize=9, textColor=MID_GREY, fontName="Helvetica")
    swahili_style = ParagraphStyle("swahili", fontSize=10, textColor=colors.HexColor("#1e293b"),
                                   fontName="Helvetica-Oblique", leading=14, spaceAfter=6)

    story = []

    # ── PAGE 1: Cover ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 3 * cm))

    # Dark navy banner table for title
    cover_data = [
        [Paragraph("OSTEX APEX", title_style)],
        [Paragraph("AI-Powered Threat Intelligence Platform", subtitle_style)],
    ]
    cover_table = Table(cover_data, colWidths=[17 * cm])
    cover_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), DARK_NAVY),
        ("TOPPADDING", (0, 0), (-1, -1), 20),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
        ("LEFTPADDING", (0, 0), (-1, -1), 20),
        ("RIGHTPADDING", (0, 0), (-1, -1), 20),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 1 * cm))

    # Org details
    org_data = [
        ["Organization:", org_name],
        ["Domain:", domain],
        ["Scan Date:", scan_date],
    ]
    org_table = Table(org_data, colWidths=[4 * cm, 13 * cm])
    org_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 0), (0, -1), DARK_NAVY),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(org_table)
    story.append(Spacer(1, 1 * cm))

    # Risk score badge
    risk_badge_data = [[
        Paragraph(f"RISK SCORE: {risk_score}/100", ParagraphStyle(
            "badge", fontSize=20, textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_CENTER)),
        Paragraph(risk_level.upper(), ParagraphStyle(
            "level", fontSize=20, textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_CENTER)),
    ]]
    risk_table = Table(risk_badge_data, colWidths=[8.5 * cm, 8.5 * cm])
    risk_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), DARK_NAVY),
        ("BACKGROUND", (1, 0), (1, 0), risk_color),
        ("TOPPADDING", (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
    ]))
    story.append(risk_table)
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph(
        "CONFIDENTIAL — For authorized personnel only. This report contains sensitive security information.",
        ParagraphStyle("conf", fontSize=8, textColor=MID_GREY, alignment=TA_CENTER)
    ))

    story.append(PageBreak())

    # ── PAGE 2: Executive Summary ──────────────────────────────────────────────
    story.append(Paragraph("Executive Summary", heading_style))
    story.append(HRFlowable(width="100%", thickness=2, color=GREEN))
    story.append(Spacer(1, 0.4 * cm))

    story.append(Paragraph("English", ParagraphStyle("lang", fontSize=11, fontName="Helvetica-Bold",
                                                       textColor=DARK_NAVY, spaceAfter=4)))
    eng_summary = _safe(analysis.get("executive_summary_english", "No analysis available."))
    story.append(Paragraph(eng_summary, body_style))
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("Kiswahili", ParagraphStyle("lang", fontSize=11, fontName="Helvetica-Bold",
                                                         textColor=DARK_NAVY, spaceAfter=4)))
    sw_summary = _safe(analysis.get("executive_summary_swahili", "Hakuna uchambuzi uliopo."))
    story.append(Paragraph(sw_summary, swahili_style))
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("Business Impact", ParagraphStyle("lang", fontSize=11, fontName="Helvetica-Bold",
                                                              textColor=DARK_NAVY, spaceAfter=4)))
    story.append(Paragraph(_safe(analysis.get("business_impact", "")), body_style))

    # Regulatory note
    story.append(Spacer(1, 0.5 * cm))
    reg_note = analysis.get("tanzanian_regulatory_note", "")
    if reg_note:
        reg_data = [[Paragraph("Tanzanian Regulatory Note (TCRA / Data Protection)", ParagraphStyle(
            "rh", fontSize=10, fontName="Helvetica-Bold", textColor=colors.HexColor("#92400e"))),
                     ], [Paragraph(_safe(reg_note), ParagraphStyle("rb", fontSize=9, textColor=colors.HexColor("#78350f"), leading=13))]]
        reg_table = Table(reg_data, colWidths=[17 * cm])
        reg_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fffbeb")),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("BOX", (0, 0), (-1, -1), 1, AMBER),
        ]))
        story.append(reg_table)

    story.append(PageBreak())

    # ── PAGE 3: CVE Findings ──────────────────────────────────────────────────
    story.append(Paragraph("CVE Findings", heading_style))
    story.append(HRFlowable(width="100%", thickness=2, color=GREEN))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(f"Total vulnerabilities found: {len(cves)}", body_style))

    if cves:
        headers = ["CVE ID", "Software", "CVSS", "Severity", "Attack Vector", "Patch"]
        rows = [headers]
        for c in cves[:40]:
            sev = c.get("severity", "Unknown")
            rows.append([
                _safe(c.get("cve_id", "")),
                _safe(c.get("software", "")),
                _safe(c.get("cvss_score", "N/A")),
                _safe(sev),
                _safe(c.get("attack_vector", "")),
                "Yes" if c.get("patch_available") else "No",
            ])
        cve_table = Table(rows, colWidths=[3.2 * cm, 2.8 * cm, 1.5 * cm, 2.2 * cm, 3.5 * cm, 1.5 * cm],
                          repeatRows=1)
        ts = TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK_NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GREY]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ])
        # Color severity cells
        for i, row in enumerate(rows[1:], 1):
            sev = row[3]
            c_color = _severity_color(sev)
            ts.add("BACKGROUND", (3, i), (3, i), c_color)
            ts.add("TEXTCOLOR", (3, i), (3, i), WHITE)
            ts.add("FONTNAME", (3, i), (3, i), "Helvetica-Bold")
        cve_table.setStyle(ts)
        story.append(cve_table)
    else:
        story.append(Paragraph("No CVEs found for the specified software stack.", body_style))

    story.append(PageBreak())

    # ── PAGE 4: Breach Intelligence ───────────────────────────────────────────
    story.append(Paragraph("Breach Intelligence", heading_style))
    story.append(HRFlowable(width="100%", thickness=2, color=GREEN))
    story.append(Spacer(1, 0.4 * cm))

    if breaches:
        for b in breaches[:15]:
            b_data = [
                [Paragraph(_safe(b.get("name", "Unknown")), ParagraphStyle("bn", fontSize=11, fontName="Helvetica-Bold",
                                                                      textColor=DARK_NAVY))],
                [Paragraph(f"Date: {_safe(b.get('breach_date', 'Unknown'))}  |  Affected accounts: {b.get('pwn_count', 0):,}",
                           small_style)],
                [Paragraph(f"Compromised data: {_safe(', '.join(b.get('compromised_data', [])))}", small_style)],
                [Paragraph(_strip_html(b.get("description", "")), body_style)],
            ]
            b_table = Table(b_data, colWidths=[17 * cm])
            b_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ]))
            story.append(b_table)
            story.append(Spacer(1, 0.3 * cm))
    else:
        story.append(Paragraph(
            "No breach records found for this domain, or HIBP API key not configured.", body_style))

    story.append(PageBreak())

    # ── PAGE 5: Active Threats ────────────────────────────────────────────────
    story.append(Paragraph("Active Threats — CISA Known Exploited Vulnerabilities", heading_style))
    story.append(HRFlowable(width="100%", thickness=2, color=RED))
    story.append(Spacer(1, 0.4 * cm))

    if exploited:
        alert_data = [[Paragraph(
            f"CRITICAL ALERT: {len(exploited)} actively exploited vulnerabilities found in your software stack!",
            ParagraphStyle("alert", fontSize=11, fontName="Helvetica-Bold", textColor=WHITE, alignment=TA_CENTER)
        )]]
        alert_table = Table(alert_data, colWidths=[17 * cm])
        alert_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), RED),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ]))
        story.append(alert_table)
        story.append(Spacer(1, 0.5 * cm))

        for e in exploited:
            e_data = [
                [Paragraph(_safe(e.get("cve_id", "")), ParagraphStyle("eid", fontSize=10, fontName="Helvetica-Bold",
                                                                 textColor=RED)),
                 Paragraph(_safe(e.get("vulnerability_name", "")), ParagraphStyle("evn", fontSize=10,
                                                                             fontName="Helvetica-Bold",
                                                                             textColor=DARK_NAVY))],
                [Paragraph(f"Product: {_safe(e.get('vendor_project', ''))} \u2014 {_safe(e.get('product', ''))}",
                           small_style),
                 Paragraph(f"Due: {_safe(e.get('due_date', ''))}  |  Added: {_safe(e.get('date_added', ''))}", small_style)],
                [Paragraph(_safe(e.get("short_description", "")), body_style),
                 Paragraph(f"Required action: {_safe(e.get('required_action', ''))}", body_style)],
            ]
            e_table = Table(e_data, colWidths=[4 * cm, 13 * cm])
            e_table.setStyle(TableStyle([
                ("BOX", (0, 0), (-1, -1), 1, RED),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("SPAN", (0, 2), (0, 2)),
            ]))
            story.append(e_table)
            story.append(Spacer(1, 0.3 * cm))
    else:
        good_data = [[Paragraph(
            "No actively exploited vulnerabilities matched from CISA KEV feed.",
            ParagraphStyle("good", fontSize=10, fontName="Helvetica-Bold", textColor=WHITE, alignment=TA_CENTER)
        )]]
        good_table = Table(good_data, colWidths=[17 * cm])
        good_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), GREEN),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ]))
        story.append(good_table)

    story.append(PageBreak())

    # ── PAGE 6: Remediation Roadmap ───────────────────────────────────────────
    story.append(Paragraph("Remediation Roadmap", heading_style))
    story.append(HRFlowable(width="100%", thickness=2, color=GREEN))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(
        "AI-generated remediation actions prioritized for this organization's risk profile:",
        body_style))
    story.append(Spacer(1, 0.3 * cm))

    top_5 = analysis.get("top_5_actions", [])
    if top_5:
        for i, action in enumerate(top_5, 1):
            action_data = [[
                Paragraph(str(i), ParagraphStyle("num", fontSize=14, fontName="Helvetica-Bold",
                                                  textColor=WHITE, alignment=TA_CENTER)),
                Paragraph(_safe(action), ParagraphStyle("act", fontSize=10, fontName="Helvetica",
                                                  textColor=DARK_NAVY, leading=14)),
            ]]
            action_table = Table(action_data, colWidths=[1 * cm, 16 * cm])
            action_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, 0), GREEN),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ]))
            story.append(action_table)
            story.append(Spacer(1, 0.2 * cm))
    else:
        story.append(Paragraph("No remediation actions available. Run AI analysis first.", body_style))

    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph(
        f"Generated by Ostex Apex on {scan_date} | ostexsentinel.com",
        ParagraphStyle("footer", fontSize=8, textColor=MID_GREY, alignment=TA_CENTER)
    ))

    doc.build(story)
    buf.seek(0)

    safe_name = org_name.replace(" ", "_").replace("/", "-")[:40]
    filename = f"OstexApex_{safe_name}_{date.today().isoformat()}.pdf"

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
