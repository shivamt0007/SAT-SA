from typing import List
from ..models.orm import TriagePolicy, FlagRecord, NegativeSpaceFinding

def match_policy(item, item_type: str, sector: str, policy: TriagePolicy) -> bool:
    """Checks whether a FlagRecord or NegativeSpaceFinding matches policy criteria."""
    if not policy.active:
        return False

    if policy.match_sector and policy.match_sector.strip():
        if (sector or '').lower() != policy.match_sector.strip().lower():
            return False

    if policy.match_severity and policy.match_severity.strip():
        if (item.severity or '').upper() != policy.match_severity.strip().upper():
            return False

    if item_type == 'FLAG':
        if policy.match_rule_id and policy.match_rule_id.strip():
            if getattr(item, 'rule_id', '') != policy.match_rule_id.strip():
                return False
        # If policy specified a finding_type, it only applies to negative space
        if policy.match_finding_type and policy.match_finding_type.strip():
            return False
    elif item_type == 'NEGATIVE_SPACE':
        if policy.match_finding_type and policy.match_finding_type.strip():
            if getattr(item, 'finding_type', '') != policy.match_finding_type.strip():
                return False
        # If policy specified a rule_id, it only applies to flags
        if policy.match_rule_id and policy.match_rule_id.strip():
            return False

    return True

def apply_triage_policies_to_flag(flag: FlagRecord, sector: str, active_policies: List[TriagePolicy]):
    """Applies the first matching active triage policy to a FlagRecord."""
    for policy in active_policies:
        if match_policy(flag, 'FLAG', sector, policy):
            flag.auto_triaged_by = policy.name
            if policy.action == 'AUTO_FALSE_POSITIVE':
                flag.status = 'FALSE_POSITIVE'
            elif policy.action == 'AUTO_ACKNOWLEDGE':
                flag.status = 'VALID'
            elif policy.action == 'AUTO_ESCALATE':
                flag.status = 'OPEN'
                # Bump severity one level
                if flag.severity == 'LOW':
                    flag.severity = 'MEDIUM'
                elif flag.severity == 'MEDIUM':
                    flag.severity = 'HIGH'
                else:
                    flag.severity = 'CRITICAL'
            break

def apply_triage_policies_to_negative_space(ns: NegativeSpaceFinding, sector: str, active_policies: List[TriagePolicy]):
    """Applies the first matching active triage policy to a NegativeSpaceFinding."""
    for policy in active_policies:
        if match_policy(ns, 'NEGATIVE_SPACE', sector, policy):
            ns.auto_triaged_by = policy.name
            if policy.action == 'AUTO_FALSE_POSITIVE':
                ns.status = 'FALSE_POSITIVE'
            elif policy.action == 'AUTO_ACKNOWLEDGE':
                ns.status = 'VALID'
            elif policy.action == 'AUTO_ESCALATE':
                ns.status = 'OPEN'
                if ns.severity == 'LOW':
                    ns.severity = 'MEDIUM'
                elif ns.severity == 'MEDIUM':
                    ns.severity = 'HIGH'
                else:
                    ns.severity = 'CRITICAL'
            break
