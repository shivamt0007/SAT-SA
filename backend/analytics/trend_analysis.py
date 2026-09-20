import json
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models.orm import BatchRecord, FlagRecord, NegativeSpaceFinding, RiskScore, EntityCycleComparison

def get_all_batches_for_entity(cse_id: str, db: Session) -> List[BatchRecord]:
    """Returns all batches that contain this cse_id, sorted by created_at desc."""
    batches = db.query(BatchRecord).order_by(desc(BatchRecord.created_at)).all()
    matching = []
    for b in batches:
        c_list = json.loads(b.cse_ids) if b.cse_ids else []
        if cse_id in c_list:
            matching.append(b)
    return matching

def compute_and_save_cycle_comparison(cse_id: str, batch_id: str, db: Session) -> Optional[EntityCycleComparison]:
    """
    Compares current assessment cycle against the immediately preceding cycle for this CSE.
    Identifies new, resolved, recurring, and chronic (>= 3 consecutive cycles) findings.
    """
    # Delete existing comparison record for this cse_id and batch_id
    db.query(EntityCycleComparison).filter(
        EntityCycleComparison.batch_id == batch_id,
        EntityCycleComparison.cse_id == cse_id
    ).delete()

    batches_for_cse = get_all_batches_for_entity(cse_id, db)
    # Find current batch index
    current_idx = next((i for i, b in enumerate(batches_for_cse) if b.id == batch_id), None)
    if current_idx is None:
        return None

    # Get current cycle findings
    curr_flags = db.query(FlagRecord).filter(FlagRecord.batch_id == batch_id, FlagRecord.cse_id == cse_id).all()
    curr_ns = db.query(NegativeSpaceFinding).filter(NegativeSpaceFinding.batch_id == batch_id, NegativeSpaceFinding.cse_id == cse_id).all()
    
    curr_rule_map = {f.rule_id: f.rule_name for f in curr_flags}
    curr_ns_map = {n.finding_type: n.finding_type.replace('_', ' ').title() for n in curr_ns}
    curr_keys = set(curr_rule_map.keys()) | set(curr_ns_map.keys())

    # Check if there is a previous cycle
    prior_batches = batches_for_cse[current_idx + 1:]
    prev_batch = prior_batches[0] if prior_batches else None

    if not prev_batch:
        # First cycle recorded for this CSE
        comp = EntityCycleComparison(
            batch_id=batch_id,
            cse_id=cse_id,
            previous_batch_id=None,
            risk_score_delta=None,
            new_findings_json=json.dumps(list(curr_keys)),
            resolved_findings_json=json.dumps([]),
            recurring_findings_json=json.dumps([]),
            chronic_findings_json=json.dumps([])
        )
        db.add(comp)
        db.commit()
        return comp

    # Previous cycle findings
    prev_flags = db.query(FlagRecord).filter(FlagRecord.batch_id == prev_batch.id, FlagRecord.cse_id == cse_id).all()
    prev_ns = db.query(NegativeSpaceFinding).filter(NegativeSpaceFinding.batch_id == prev_batch.id, NegativeSpaceFinding.cse_id == cse_id).all()
    prev_keys = set(f.rule_id for f in prev_flags) | set(n.finding_type for n in prev_ns)

    new_keys = list(curr_keys - prev_keys)
    resolved_keys = list(prev_keys - curr_keys)
    recurring_keys = list(curr_keys & prev_keys)

    # Risk score delta
    curr_rs = db.query(RiskScore).filter(RiskScore.batch_id == batch_id, RiskScore.cse_id == cse_id).first()
    prev_rs = db.query(RiskScore).filter(RiskScore.batch_id == prev_batch.id, RiskScore.cse_id == cse_id).first()
    delta = None
    if curr_rs and prev_rs and curr_rs.risk_score is not None and prev_rs.risk_score is not None:
        delta = round(curr_rs.risk_score - prev_rs.risk_score, 2)

    # Walk backwards through all prior batches to calculate consecutive appearances
    chronic_findings = []
    # All batches from current backwards: [Batch_current, Batch_prior1, Batch_prior2, ...]
    cycle_history = batches_for_cse[current_idx:]

    for key in recurring_keys:
        consecutive_count = 1  # present in current
        for prior_b in cycle_history[1:]:
            p_flags = db.query(FlagRecord.id).filter(FlagRecord.batch_id == prior_b.id, FlagRecord.cse_id == cse_id, FlagRecord.rule_id == key).first()
            p_ns = db.query(NegativeSpaceFinding.id).filter(NegativeSpaceFinding.batch_id == prior_b.id, NegativeSpaceFinding.cse_id == cse_id, NegativeSpaceFinding.finding_type == key).first()
            if p_flags or p_ns:
                consecutive_count += 1
            else:
                break
        
        if consecutive_count >= 3:
            label = curr_rule_map.get(key) or curr_ns_map.get(key) or key
            chronic_findings.append({
                "rule_id": key,
                "label": label,
                "consecutive_cycles": consecutive_count
            })

    comp = EntityCycleComparison(
        batch_id=batch_id,
        cse_id=cse_id,
        previous_batch_id=prev_batch.id,
        risk_score_delta=delta,
        new_findings_json=json.dumps(new_keys),
        resolved_findings_json=json.dumps(resolved_keys),
        recurring_findings_json=json.dumps(recurring_keys),
        chronic_findings_json=json.dumps(chronic_findings)
    )
    db.add(comp)
    db.commit()
    return comp

def get_entity_trend_data(cse_id: str, batch_id: str, db: Session) -> Dict[str, Any]:
    """
    Retrieves comparative cycle trend data and multi-cycle risk score history for an entity.
    """
    comp = db.query(EntityCycleComparison).filter(
        EntityCycleComparison.batch_id == batch_id,
        EntityCycleComparison.cse_id == cse_id
    ).first()

    # If comparison doesn't exist yet, compute on the fly
    if not comp:
        comp = compute_and_save_cycle_comparison(cse_id, batch_id, db)

    # Multi-cycle historical sparkline
    all_batches = get_all_batches_for_entity(cse_id, db)
    history = []
    # Chronological order (oldest to newest)
    for b in reversed(all_batches):
        rs = db.query(RiskScore).filter(RiskScore.batch_id == b.id, RiskScore.cse_id == cse_id).first()
        if rs:
            history.append({
                "batch_id": b.id,
                "batch_label": f"BATCH-{b.id[:8]}",
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "risk_score": round(rs.risk_score, 1) if rs.risk_score is not None else 0.0,
                "risk_level": rs.risk_level,
                "flag_count": rs.flag_count or 0
            })

    new_list = json.loads(comp.new_findings_json) if comp and comp.new_findings_json else []
    res_list = json.loads(comp.resolved_findings_json) if comp and comp.resolved_findings_json else []
    rec_list = json.loads(comp.recurring_findings_json) if comp and comp.recurring_findings_json else []
    chronic_list = json.loads(comp.chronic_findings_json) if comp and comp.chronic_findings_json else []

    comparison = {
        "previous_batch_id": comp.previous_batch_id if comp else None,
        "risk_score_delta": comp.risk_score_delta if comp else None,
        "new_findings": new_list,
        "resolved_findings": res_list,
        "recurring_findings": rec_list,
        "chronic_findings": chronic_list,
    }

    return {
        "cse_id": cse_id,
        "batch_id": batch_id,
        "previous_batch_id": comp.previous_batch_id if comp else None,
        "risk_score_delta": comp.risk_score_delta if comp else None,
        "new_findings": new_list,
        "resolved_findings": res_list,
        "recurring_findings": rec_list,
        "chronic_findings": chronic_list,
        "comparison": comparison,
        "history": history
    }
