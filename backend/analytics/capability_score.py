import numpy as np
from typing import Dict, List, Any
from sqlalchemy.orm import Session

from .capability_mapping import CAPABILITIES, get_capabilities_for_finding
from ..models.orm import FlagRecord, NegativeSpaceFinding, CSEFeatures

SEVERITY_WEIGHTS = {
    'CRITICAL': 35.0,
    'HIGH': 25.0,
    'MEDIUM': 15.0,
    'LOW': 5.0
}

def compute_entity_capability_profile(cse_id: str, batch_id: str, db: Session) -> Dict[str, Any]:
    """
    Computes an 8-capability compliance / risk profile for a given CSE.
    Scores reflect supervisory deficit / risk in each capability (0 = no findings, 100 = critical gaps).
    Also computes sector peer average per capability.
    """
    # 1. Fetch current entity's sector
    feat = db.query(CSEFeatures).filter(CSEFeatures.batch_id == batch_id, CSEFeatures.cse_id == cse_id).first()
    sector = feat.sector if feat and feat.sector else 'Unknown'

    # 2. Fetch all CSEs in the batch and sector peers
    all_batch_features = db.query(CSEFeatures).filter(CSEFeatures.batch_id == batch_id).all()
    all_cse_ids = [f.cse_id for f in all_batch_features]
    
    sector_peer_ids = [f.cse_id for f in all_batch_features if f.sector == sector]
    if len(sector_peer_ids) < 2:
        sector_peer_ids = all_cse_ids

    # 3. Helper to get all findings for an entity
    def get_findings_for_cse(cid: str):
        flags = db.query(FlagRecord).filter(FlagRecord.batch_id == batch_id, FlagRecord.cse_id == cid).all()
        ns_findings = db.query(NegativeSpaceFinding).filter(NegativeSpaceFinding.batch_id == batch_id, NegativeSpaceFinding.cse_id == cid).all()
        
        items = []
        for f in flags:
            items.append({
                "id": f"FND-FLAG-{f.id}",
                "key": f.rule_id,
                "title": f.rule_name,
                "description": f.description,
                "severity": f.severity or 'HIGH',
                "type": 'EXECUTION_GAP',
                "capabilities": get_capabilities_for_finding(f.rule_id)
            })
        for n in ns_findings:
            items.append({
                "id": f"FND-NS-{n.id}",
                "key": n.finding_type,
                "title": n.finding_type.replace('_', ' ').title(),
                "description": n.description,
                "severity": n.severity or 'HIGH',
                "type": 'NEGATIVE_SPACE',
                "capabilities": get_capabilities_for_finding(n.finding_type)
            })
        return items

    # Findings for target entity
    entity_findings = get_findings_for_cse(cse_id)

    # 4. Compute scores per capability for all peers to get sector average
    peer_capability_scores = {cap: [] for cap in CAPABILITIES}
    for pid in sector_peer_ids:
        p_findings = entity_findings if pid == cse_id else get_findings_for_cse(pid)
        for cap in CAPABILITIES:
            cap_findings = [f for f in p_findings if cap in f['capabilities']]
            raw_score = sum(SEVERITY_WEIGHTS.get(f['severity'], 15.0) for f in cap_findings)
            peer_capability_scores[cap].append(min(100.0, raw_score))

    # 5. Build final output list for the 8 capabilities
    capabilities_result = []
    for cap in CAPABILITIES:
        cap_findings = [f for f in entity_findings if cap in f['capabilities']]
        entity_score = round(min(100.0, sum(SEVERITY_WEIGHTS.get(f['severity'], 15.0) for f in cap_findings)), 1)
        
        peer_vals = peer_capability_scores[cap]
        sector_avg = round(float(np.mean(peer_vals)), 1) if peer_vals else 0.0
        status = 'NEEDS_ATTENTION' if entity_score >= 35.0 or (entity_score - sector_avg > 15.0) else 'ADEQUATE'

        capabilities_result.append({
            "name": cap,
            "capability": cap,
            "entity_score": entity_score,
            "score": entity_score,
            "sector_avg_score": sector_avg,
            "peer_average": sector_avg,
            "status": status,
            "findings_count": len(cap_findings),
            "contributing_finding_ids": [f['id'] for f in cap_findings],
            "contributing_findings": cap_findings
        })

    overall_score = round(float(np.mean([c['score'] for c in capabilities_result])), 1) if capabilities_result else 0.0

    return {
        "cse_id": cse_id,
        "sector": sector,
        "batch_id": batch_id,
        "overall_capability_score": overall_score,
        "capabilities": capabilities_result
    }
