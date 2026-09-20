import json
import math
from datetime import datetime
from collections import Counter
from typing import List, Dict
from sqlalchemy.orm import Session

from ..models.orm import FlagRecord, NegativeSpaceFinding, SystemicPattern, CSEFeatures

SEVERITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

def bump_severity(sev: str) -> str:
    s = (sev or 'MEDIUM').upper()
    if s == 'LOW':
        return 'MEDIUM'
    elif s == 'MEDIUM':
        return 'HIGH'
    else:
        return 'CRITICAL'

def detect_and_save_systemic_patterns(batch_id: str, total_cses: int, sector_map: Dict[str, str], db: Session) -> List[SystemicPattern]:
    """
    Detects cross-entity systemic patterns in flags and negative-space findings.
    Threshold: max(3, ceil(0.3 * total_cses_in_batch)).
    If entity_count >= threshold, saves SystemicPattern with escalated severity.
    """
    # Delete existing systemic patterns for this batch
    db.query(SystemicPattern).filter(SystemicPattern.batch_id == batch_id).delete()
    
    if total_cses <= 0:
        db.commit()
        return []

    threshold = max(3, math.ceil(0.3 * total_cses))
    patterns_created = []

    # 1. Group FlagRecords by rule_id
    flags = db.query(FlagRecord).filter(FlagRecord.batch_id == batch_id).all()
    flags_by_rule = {}
    for f in flags:
        flags_by_rule.setdefault(f.rule_id, []).append(f)

    for rule_id, rule_flags in flags_by_rule.items():
        distinct_cses = sorted(list(set(f.cse_id for f in rule_flags)))
        count = len(distinct_cses)
        if count >= threshold:
            rule_name = rule_flags[0].rule_name or rule_id
            # Find most common severity
            sev_counts = Counter(f.severity for f in rule_flags)
            modal_sev = sev_counts.most_common(1)[0][0] if sev_counts else 'HIGH'
            escalated_sev = bump_severity(modal_sev)
            
            # Distinct sectors
            affected_sectors = sorted(list(set(sector_map.get(cid, 'Unknown') for cid in distinct_cses)))
            
            desc = (
                f"Systemic pattern detected across {count} of {total_cses} Critical Sector Entities "
                f"({', '.join(affected_sectors)}): {rule_name}. "
                f"Exhibits cross-organizational operational process gap."
            )
            
            pat = SystemicPattern(
                batch_id=batch_id,
                pattern_key=rule_id,
                pattern_label=rule_name,
                entity_count=count,
                total_entities_in_batch=total_cses,
                affected_entities_json=json.dumps(distinct_cses),
                sectors_json=json.dumps(affected_sectors),
                severity=escalated_sev,
                description=desc,
                created_at=datetime.utcnow()
            )
            db.add(pat)
            patterns_created.append(pat)

    # 2. Group NegativeSpaceFindings by finding_type
    ns_findings = db.query(NegativeSpaceFinding).filter(NegativeSpaceFinding.batch_id == batch_id).all()
    ns_by_type = {}
    for n in ns_findings:
        ns_by_type.setdefault(n.finding_type, []).append(n)

    for finding_type, items in ns_by_type.items():
        distinct_cses = sorted(list(set(n.cse_id for n in items)))
        count = len(distinct_cses)
        if count >= threshold:
            label = finding_type.replace('_', ' ').title()
            sev_counts = Counter(n.severity for n in items)
            modal_sev = sev_counts.most_common(1)[0][0] if sev_counts else 'HIGH'
            escalated_sev = bump_severity(modal_sev)
            
            affected_sectors = sorted(list(set(sector_map.get(cid, 'Unknown') for cid in distinct_cses)))
            
            desc = (
                f"Systemic monitoring absence detected across {count} of {total_cses} Critical Sector Entities: "
                f"{label}. Signals potential industry-wide telemetry blind spot or shared tooling limitation."
            )
            
            pat = SystemicPattern(
                batch_id=batch_id,
                pattern_key=finding_type,
                pattern_label=label,
                entity_count=count,
                total_entities_in_batch=total_cses,
                affected_entities_json=json.dumps(distinct_cses),
                sectors_json=json.dumps(affected_sectors),
                severity=escalated_sev,
                description=desc,
                created_at=datetime.utcnow()
            )
            db.add(pat)
            patterns_created.append(pat)

    db.commit()
    return patterns_created
