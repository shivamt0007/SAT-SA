import io
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from jinja2 import Template
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

from ..models.orm import AdvisoryDraft, FlagRecord, NegativeSpaceFinding, CSEFeatures, RiskScore

CORRECTIVE_ACTIONS = {
    "R-01": "Establish mandatory triage controls to prevent critical severity alerts from being resolved without a formal linked case record.",
    "R-02": "Review case-closure procedures to ensure analyst investigation depth and dwell time are strictly proportionate to alert severity (minimum 8.0 minutes baseline).",
    "R-03": "Audit escalation criteria and ensure complex or high-impact incidents are elevated to Tier-2 / Tier-3 supervisory review (target >= 10% escalation rate).",
    "R-04": "Eliminate copy-paste and automated templated closure text in case notes; enforce substantive case-specific root-cause documentation.",
    "R-05": "Conduct immediate physical and telemetry inspection of silent critical assets to verify log forwarder agent health and SIEM ingestion.",
    "R-06": "Verify SIEM detection rule coverage across all severity bands to resolve blind spots in alert generation.",
    "R-07": "Increase log collection granularity and monitoring sensor coverage across designated critical infrastructure assets.",
    "R-08": "Investigate scripted closure mechanisms and ensure human analyst verification precedes incident closure.",
    "MISSING_TELEMETRY": "Remediate telemetry blackout on catalogued critical infrastructure by restoring event stream connectivity and forwarder heartbeat.",
    "MISSING_ALERT_CATEGORY": "Audit sensor rules and correlation pipelines to ensure alerts of this severity tier are actively evaluated and recorded.",
    "MISSING_ESCALATION": "Enforce standard operating procedures requiring formal escalation records for incidents meeting critical sector thresholds."
}

ADVISORY_JINJA_TEMPLATE = """
NATIONAL CRITICAL INFORMATION INFRASTRUCTURE PROTECTION CENTRE
OFFICE OF THE SUPERVISORY CONTROLLER — NEW DELHI
Ref: NCIIPC/SAT-SA/ADV/{{ cycle_year }}/{{ cse_id }}
Date: {{ generated_date }}

SUPERVISORY ADVISORY & CORRECTIVE ACTION DIRECTIVE

TO: Chief Information Security Officer / SOC Director
ENTITY: {{ cse_id }} (Sector: {{ sector }})
ASSESSMENT BATCH: {{ batch_id }}
ASSIGNED SUPERVISORY TIER: {{ risk_level }} (Composite Risk Score: {{ risk_score }}/100)

SUBJECT: Formal Notice of Operational Process Deviations & Mandatory Remediation

1. OPERATIONAL CONTEXT & SUPERVISORY DETERMINATION
In accordance with the National Critical Sector Cybersecurity Framework, an automated air-gapped supervisory audit of structured operational evidence submitted for {{ cse_id }} was completed on {{ generated_date }}.

The evaluation revealed notable operational execution gaps and monitoring absences requiring formal supervisory notice. The supervisory score indicates an elevated operational risk posture relative to sector peer baselines.

2. SPECIFIC DEFICIENCIES IDENTIFIED FOR IMMEDIATE REMEDIATION
{% for item in findings %}
* Finding [{{ item.key }}] - {{ item.title }} (Severity: {{ item.severity }})
  - Observation: {{ item.description }}
  - Cited Evidence Records: {{ item.evidence_count }} record(s) cited.
  - Required Directive: {{ item.corrective_action }}

{% endfor %}

3. MANDATORY TIME-BOUND REMEDIATION REQUIREMENTS
The management of {{ cse_id }} is directed to implement the following supervisory measures:
a) Conduct an internal technical review of the cited findings within 14 calendar days of receipt.
b) Submit a signed Corrective Action Plan (CAP) addressing the specific process gaps and monitoring blind spots detailed in Section 2.
c) Verify telemetry forwarding and log ingestion integrity across all enrolled Tier-1 infrastructure.

4. SUPERVISORY VERIFICATION
A follow-up supervisory review cycle will be scheduled upon ingestion of the next submission batch. Persistent or recurring unaddressed deficiencies will be escalated to statutory regulatory oversight.

Issued under authority of:
Supervisory Analytics Evaluation Unit
National Critical Information Infrastructure Protection Centre (NCIIPC / NTRO)
Status: {{ status }}
Approved by: {{ approved_by or "Pending Supervisory Sign-off" }}
"""

def generate_advisory_content(cse_id: str, sector: str, risk_score: float, risk_level: str, batch_id: str, findings_data: List[Dict[str, Any]]) -> Dict[str, str]:
    """Deterministically generates subject and formal advisory body text via Jinja2."""
    now = datetime.utcnow()
    cycle_year = now.strftime("%Y")
    generated_date = now.strftime("%d %B %Y")
    
    findings_for_template = []
    for f in findings_data:
        key = f.get('key', 'UNKNOWN')
        corrective = CORRECTIVE_ACTIONS.get(key, "Review SOC standard operating procedures and implement corrective controls to restore compliance.")
        findings_for_template.append({
            "key": key,
            "title": f.get('title', key),
            "severity": f.get('severity', 'HIGH'),
            "description": f.get('description', ''),
            "evidence_count": f.get('evidence_count', 1),
            "corrective_action": corrective
        })

    tmpl = Template(ADVISORY_JINJA_TEMPLATE)
    body_text = tmpl.render(
        cycle_year=cycle_year,
        cse_id=cse_id,
        sector=sector or "Critical Sector",
        batch_id=batch_id,
        risk_score=f"{risk_score:.1f}" if risk_score is not None else "N/A",
        risk_level=risk_level or "EVALUATED",
        generated_date=generated_date,
        findings=findings_for_template,
        status="DRAFT",
        approved_by=None
    ).strip()

    subject = f"NCIIPC Supervisory Advisory Directive: Operational Process Remediations ({cse_id})"
    return {"subject": subject, "body_text": body_text}

def generate_advisory_pdf(advisory: AdvisoryDraft) -> io.BytesIO:
    """Generates a formal, printable PDF document using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0f172a'),
        alignment=1, # Center
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569'),
        alignment=1,
        spaceAfter=14
    )
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#1e3a8a'),
        spaceBefore=10,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=6
    )
    mono_style = ParagraphStyle(
        'MonoText',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#334155')
    )

    story = []

    # Header
    story.append(Paragraph("NATIONAL CRITICAL INFORMATION INFRASTRUCTURE PROTECTION CENTRE", title_style))
    story.append(Paragraph("OFFICE OF THE SUPERVISORY CONTROLLER · AIR-GAPPED VERIFICATION", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f172a'), spaceAfter=12))

    # Meta Table
    meta_data = [
        [Paragraph(f"<b>ENTITY:</b> {advisory.cse_id}", body_style), Paragraph(f"<b>BATCH:</b> {advisory.batch_id[:12]}...", body_style)],
        [Paragraph(f"<b>STATUS:</b> {advisory.status}", body_style), Paragraph(f"<b>DATE:</b> {advisory.generated_at.strftime('%Y-%m-%d') if advisory.generated_at else 'N/A'}", body_style)],
        [Paragraph(f"<b>APPROVED BY:</b> {advisory.approved_by or 'Pending Review'}", body_style), Paragraph(f"<b>REF:</b> ADV-{advisory.id or 1}", body_style)]
    ]
    t = Table(meta_data, colWidths=[250, 250])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 14))

    # Subject
    story.append(Paragraph(f"<b>SUBJECT: {advisory.subject}</b>", ParagraphStyle('Subj', parent=body_style, fontName='Helvetica-Bold', fontSize=10, leading=14)))
    story.append(Spacer(1, 10))

    # Parse body paragraphs
    lines = advisory.body_text.split('\n')
    for line in lines:
        stripped = line.strip()
        if not stripped:
            story.append(Spacer(1, 4))
        elif stripped.startswith('1. ') or stripped.startswith('2. ') or stripped.startswith('3. ') or stripped.startswith('4. '):
            story.append(Paragraph(stripped, section_style))
        elif stripped.startswith('* Finding'):
            story.append(Paragraph(f"<b>{stripped}</b>", ParagraphStyle('Fnd', parent=body_style, textColor=colors.HexColor('#0f172a'))))
        elif stripped.startswith('- '):
            story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;{stripped}", body_style))
        elif stripped.startswith('a) ') or stripped.startswith('b) ') or stripped.startswith('c) '):
            story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;{stripped}", body_style))
        elif "SUPERVISORY ADVISORY" in stripped or "NATIONAL CRITICAL" in stripped or "TO:" in stripped or "Ref:" in stripped:
            continue
        else:
            story.append(Paragraph(stripped, body_style))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#94a3b8'), spaceAfter=10))

    # Signature Block
    sig_data = [
        [Paragraph("<b>Supervisory Evaluation Officer</b><br/>Directorate of Critical Sector Security Operations", body_style),
         Paragraph("<b>Audit Verification Seal</b><br/>Verified Grounded Analytical Evidence", body_style)]
    ]
    sig_table = Table(sig_data, colWidths=[250, 250])
    sig_table.setStyle(TableStyle([
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(sig_table)

    doc.build(story)
    buffer.seek(0)
    return buffer
