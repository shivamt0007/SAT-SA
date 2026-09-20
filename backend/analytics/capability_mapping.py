# NCIIPC / NTRO 8-Capability Framework Mapping

CAPABILITIES = [
    "Threat Detection",
    "Investigation",
    "Escalation",
    "Incident Response",
    "Security Operations",
    "Governance and Oversight",
    "Operational Discipline",
    "Cyber Resilience",
]

# Map every rule_id from rules.py to the capability area(s) it reflects operational evidence about
RULE_TO_CAPABILITY = {
    "R-01": ["Investigation", "Incident Response"],
    "R-02": ["Investigation", "Operational Discipline"],
    "R-03": ["Escalation", "Governance and Oversight"],
    "R-04": ["Investigation", "Operational Discipline"],
    "R-05": ["Threat Detection", "Security Operations"],
    "R-06": ["Threat Detection", "Cyber Resilience"],
    "R-07": ["Threat Detection", "Security Operations"],
    "R-08": ["Operational Discipline", "Governance and Oversight"],
}

# Map negative space finding types to the capability area(s) they indicate gaps in
NEGATIVE_SPACE_TO_CAPABILITY = {
    "MISSING_TELEMETRY": ["Threat Detection", "Security Operations"],
    "MISSING_ALERT_CATEGORY": ["Threat Detection", "Cyber Resilience"],
    "MISSING_ESCALATION": ["Escalation", "Governance and Oversight"],
}

def get_capabilities_for_finding(finding_key: str) -> list:
    """Return list of mapped capabilities for a given rule_id or finding_type."""
    if finding_key in RULE_TO_CAPABILITY:
        return RULE_TO_CAPABILITY[finding_key]
    if finding_key in NEGATIVE_SPACE_TO_CAPABILITY:
        return NEGATIVE_SPACE_TO_CAPABILITY[finding_key]
    # Fallback to general operations if unknown
    return ["Security Operations"]
