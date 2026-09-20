import json
from typing import Dict, List, Any
from sqlalchemy.orm import Session

from ..models.orm import RiskScore, FlagRecord, NegativeSpaceFinding, AlertRecord, CaseRecord, SampleReviewRecord

SEVERITY_WEIGHT_MAP = {
    'CRITICAL': 4,
    'HIGH': 3,
    'MEDIUM': 2,
    'LOW': 1
}

def generate_sampling_plan(batch_id: str, target_sample_size: int, db: Session) -> Dict[str, Any]:
    """
    Computes a risk-weighted manual review sampling plan across entities and open findings.
    Allocates sample budget proportionally to entity composite risk scores.
    Stratifies evidence selection across findings weighted by severity.
    Includes persistent review status from SampleReviewRecord.
    """
    risk_scores = db.query(RiskScore).filter(RiskScore.batch_id == batch_id).all()
    if not risk_scores:
        return {"total_sample_size": 0, "entities": []}

    # Fetch existing sample review statuses for this batch
    existing_reviews = db.query(SampleReviewRecord).filter(SampleReviewRecord.batch_id == batch_id).all()
    review_status_map = {r.record_id: (r.reviewed, r.reviewed_by) for r in existing_reviews}

    # Total score for weighting
    total_score = sum(rs.risk_score for rs in risk_scores if rs.risk_score is not None and not rs.is_grey)
    if total_score <= 0:
        total_score = sum(rs.risk_score or 1.0 for rs in risk_scores)

    # 1. Calculate budget per entity
    entity_budgets = {}
    remaining_budget = target_sample_size

    for rs in risk_scores:
        if rs.is_grey:
            continue
        
        # Check if entity has findings
        f_count = db.query(FlagRecord).filter(FlagRecord.batch_id == batch_id, FlagRecord.cse_id == rs.cse_id).count()
        ns_count = db.query(NegativeSpaceFinding).filter(NegativeSpaceFinding.batch_id == batch_id, NegativeSpaceFinding.cse_id == rs.cse_id).count()
        total_findings = f_count + ns_count
        
        if total_findings == 0:
            continue

        raw_budget = round(target_sample_size * ((rs.risk_score or 0) / max(total_score, 1.0)))
        budget = max(1, raw_budget)
        entity_budgets[rs.cse_id] = budget

    # Normalize entity budgets to not wildly exceed target_sample_size
    budget_sum = sum(entity_budgets.values())
    if budget_sum > 0 and budget_sum > target_sample_size * 1.2:
        scale = target_sample_size / budget_sum
        entity_budgets = {cid: max(1, int(round(b * scale))) for cid, b in entity_budgets.items()}

    # 2. Within each entity, select evidence records
    entities_result = []

    for cse_id, budget in entity_budgets.items():
        flags = db.query(FlagRecord).filter(FlagRecord.batch_id == batch_id, FlagRecord.cse_id == cse_id).all()
        ns_findings = db.query(NegativeSpaceFinding).filter(NegativeSpaceFinding.batch_id == batch_id, NegativeSpaceFinding.cse_id == cse_id).all()

        finding_items = []
        for f in flags:
            ev_ids = json.loads(f.evidence_ids_json) if f.evidence_ids_json else []
            finding_items.append({
                "key": f.rule_id,
                "name": f.rule_name,
                "severity": f.severity or 'HIGH',
                "weight": SEVERITY_WEIGHT_MAP.get(f.severity or 'HIGH', 2),
                "evidence_ids": ev_ids,
                "type": "FLAG"
            })
        for n in ns_findings:
            ev_ids = [n.asset_id] if n.asset_id else []
            finding_items.append({
                "key": n.finding_type,
                "name": n.finding_type.replace('_', ' ').title(),
                "severity": n.severity or 'HIGH',
                "weight": SEVERITY_WEIGHT_MAP.get(n.severity or 'HIGH', 2),
                "evidence_ids": ev_ids,
                "type": "NEGATIVE_SPACE"
            })

        # Sort findings by severity weight descending
        finding_items.sort(key=lambda x: -x["weight"])

        selected_records = []
        seen_record_ids = set()

        # Pass 1: minimum 1 record per finding if budget allows
        for f in finding_items:
            if len(selected_records) >= budget:
                break
            for rid in f["evidence_ids"]:
                if rid and rid not in seen_record_ids:
                    seen_record_ids.add(rid)
                    rev_info = review_status_map.get(rid, (False, None))
                    selected_records.append({
                        "record_id": rid,
                        "record_type": "CASE" if "CAS" in rid or "CASE" in rid else "ALERT",
                        "rule_key": f["key"],
                        "finding_title": f["name"],
                        "severity": f["severity"],
                        "reason": f"Audit evidence for {f['key']}: {f['name']}",
                        "reviewed": rev_info[0],
                        "reviewed_by": rev_info[1]
                    })
                    break

        # Pass 2: fill remaining budget from highest severity findings first
        for f in finding_items:
            if len(selected_records) >= budget:
                break
            for rid in f["evidence_ids"]:
                if len(selected_records) >= budget:
                    break
                if rid and rid not in seen_record_ids:
                    seen_record_ids.add(rid)
                    rev_info = review_status_map.get(rid, (False, None))
                    selected_records.append({
                        "record_id": rid,
                        "record_type": "CASE" if "CAS" in rid or "CASE" in rid else "ALERT",
                        "rule_key": f["key"],
                        "finding_title": f["name"],
                        "severity": f["severity"],
                        "reason": f"Additional sample for {f['key']}: {f['name']}",
                        "reviewed": rev_info[0],
                        "reviewed_by": rev_info[1]
                    })

        # Fallback if no evidence_ids were logged in rules: sample directly from AlertRecord
        if len(selected_records) < budget:
            fallback_alerts = db.query(AlertRecord.alert_id, AlertRecord.severity).filter(
                AlertRecord.batch_id == batch_id,
                AlertRecord.cse_id == cse_id
            ).order_by(AlertRecord.created_at.desc()).limit(budget - len(selected_records)).all()

            for a in fallback_alerts:
                if a.alert_id not in seen_record_ids:
                    seen_record_ids.add(a.alert_id)
                    rev_info = review_status_map.get(a.alert_id, (False, None))
                    selected_records.append({
                        "record_id": a.alert_id,
                        "record_type": "ALERT",
                        "rule_key": "BASELINE",
                        "finding_title": "Supervisory Baseline Sample",
                        "severity": a.severity or 'MEDIUM',
                        "reason": f"Sampled {a.severity} telemetry event for supervisory verification",
                        "reviewed": rev_info[0],
                        "reviewed_by": rev_info[1]
                    })

        entities_result.append({
            "cse_id": cse_id,
            "allocated_size": len(selected_records),
            "sampled_records": selected_records
        })

    # Sort entities by allocated size descending
    entities_result.sort(key=lambda x: -x["allocated_size"])

    flat_samples = []
    for e in entities_result:
        for r in e["sampled_records"]:
            flat_samples.append({
                "evidence_id": r["record_id"],
                "record_id": r["record_id"],
                "cse_id": e["cse_id"],
                "record_type": r["record_type"],
                "severity": r["severity"],
                "stratum": f"{r['severity']} / {r['rule_key']}",
                "weight": SEVERITY_WEIGHT_MAP.get(r["severity"], 2),
                "reviewed": r["reviewed"],
                "reviewer": r["reviewed_by"],
                "reviewed_by": r["reviewed_by"],
                "notes": "",
                "rule_or_event": r["finding_title"],
                "reason": r["reason"]
            })

    total_reviewed = sum(1 for s in flat_samples if s["reviewed"])
    actual_total = len(flat_samples)

    entity_budgets_list = [
        {"cse_id": e["cse_id"], "allocated_count": e["allocated_size"]}
        for e in entities_result
    ]

    summary = {
        "total_sampled": actual_total,
        "total_reviewed": total_reviewed,
        "pending_review": actual_total - total_reviewed
    }

    return {
        "batch_id": batch_id,
        "requested_sample_size": target_sample_size,
        "total_sample_size": actual_total,
        "entities": entities_result,
        "samples": flat_samples,
        "entity_budgets": entity_budgets_list,
        "summary": summary
    }
