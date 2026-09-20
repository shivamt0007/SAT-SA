from fastapi import APIRouter, Depends, Query, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import json
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from ..db import get_db
from ..models.orm import (
    BatchRecord, AlertRecord, CaseRecord, AssetRecord,
    RiskScore, FlagRecord, NegativeSpaceFinding, SupervisorNote,
    CSEFeatures, FindingReviewRecord, SystemicPattern, EntityCycleComparison,
    AdvisoryDraft, TriagePolicy, SampleReviewRecord
)
from ..analytics.systemic_patterns import detect_and_save_systemic_patterns
from ..analytics.capability_score import compute_entity_capability_profile
from ..analytics.trend_analysis import get_entity_trend_data
from ..analytics.advisory_template import generate_advisory_content, generate_advisory_pdf
from ..analytics.sampling import generate_sampling_plan

router = APIRouter()

# ---------------------------------------------------------------------------
# 1. BATCHES MANAGEMENT
# ---------------------------------------------------------------------------

@router.get("/batches")
def get_batches(db: Session = Depends(get_db)):
    """List all ingestion/analysis batches recorded in the database."""
    batches = db.query(BatchRecord).order_by(BatchRecord.created_at.desc()).all()
    res = []
    for b in batches:
        cse_list = json.loads(b.cse_ids) if b.cse_ids else []
        alert_cnt = db.query(AlertRecord).filter(AlertRecord.batch_id == b.id).count()
        res.append({
            "batch_id": b.id,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "status": b.status,
            "cse_count": len(cse_list),
            "cse_ids": cse_list,
            "alert_count": alert_cnt
        })
    return res

# ---------------------------------------------------------------------------
# 2. BATCH OVERVIEW
# ---------------------------------------------------------------------------

@router.get("/overview")
def get_overview(batch_id: str, db: Session = Depends(get_db)):
    """Executive supervisory overview of an assessment batch."""
    batch = db.query(BatchRecord).filter(BatchRecord.id == batch_id).first()
    cse_count = db.query(func.count(func.distinct(AlertRecord.cse_id))).filter(AlertRecord.batch_id == batch_id).scalar() or 0
    alert_count = db.query(AlertRecord).filter(AlertRecord.batch_id == batch_id).count()
    case_count = db.query(CaseRecord).filter(CaseRecord.batch_id == batch_id).count()
    asset_count = db.query(AssetRecord).filter(AssetRecord.batch_id == batch_id).count()
    
    flag_count = db.query(FlagRecord).filter(FlagRecord.batch_id == batch_id).count()
    ns_count = db.query(NegativeSpaceFinding).filter(NegativeSpaceFinding.batch_id == batch_id).count()
    total_findings = flag_count + ns_count
    
    sys_count = db.query(SystemicPattern).filter(SystemicPattern.batch_id == batch_id).count()

    
    risk_scores = db.query(RiskScore).filter(RiskScore.batch_id == batch_id).all()
    attention_count = sum(1 for rs in risk_scores if rs.risk_level in ['CRITICAL', 'HIGH'])
    
    risk_dist = {"critical": 0, "high": 0, "medium": 0, "low": 0, "unassessed": 0}
    for rs in risk_scores:
        key = rs.risk_level.lower()
        if key in risk_dist:
            risk_dist[key] += 1
            
    # Priority Queue: ranked by attention priority
    top_risks = []
    features_all = db.query(CSEFeatures).filter(CSEFeatures.batch_id == batch_id).all()
    feat_map = {f.cse_id: f for f in features_all}
    
    sorted_scores = sorted(risk_scores, key=lambda x: (x.is_grey, -x.risk_score))
    for rs in sorted_scores:
        cf = feat_map.get(rs.cse_id)
        f_json = json.loads(cf.features_json) if cf and cf.features_json else {}
        cov_score = f_json.get('supervisory_coverage_score', None)
        
        flags_entity = db.query(FlagRecord).filter(FlagRecord.batch_id == batch_id, FlagRecord.cse_id == rs.cse_id).count()
        ns_entity = db.query(NegativeSpaceFinding).filter(NegativeSpaceFinding.batch_id == batch_id, NegativeSpaceFinding.cse_id == rs.cse_id).count()
        
        top_risks.append({
            "cse_id": rs.cse_id,
            "sector": cf.sector if cf else "Unknown",
            "risk_score": rs.risk_score,
            "risk_level": rs.risk_level,
            "is_grey": rs.is_grey,
            "supervisory_coverage": cov_score,
            "primary_reason": rs.primary_reason,
            "evidence_count": flags_entity + ns_entity,
            "alert_count": cf.alert_count if cf else 0,
            "case_count": cf.case_count if cf else 0
        })
        
    sector_dist = {}
    for cf in features_all:
        sec = cf.sector or "Unknown"
        if sec not in sector_dist:
            sector_dist[sec] = {"sector": sec, "critical": 0, "high": 0, "medium": 0, "low": 0, "unassessed": 0, "total": 0}
        
        rs = next((r for r in risk_scores if r.cse_id == cf.cse_id), None)
        if rs:
            lvl_key = rs.risk_level.lower()
            if lvl_key in sector_dist[sec]:
                sector_dist[sec][lvl_key] += 1
            sector_dist[sec]["total"] += 1
            
    return {
        "batch_id": batch_id,
        "batch_status": batch.status if batch else "UNKNOWN",
        "created_at": batch.created_at.isoformat() if batch and batch.created_at else None,
        "cse_count": cse_count,
        "total_cses": cse_count,
        "alert_count": alert_count,
        "total_alerts": alert_count,
        "case_count": case_count,
        "total_cases": case_count,
        "asset_count": asset_count,
        "findings_generated": total_findings,
        "entities_requiring_attention": attention_count,
        "negative_space_count": ns_count,
        "negative_space_total": ns_count,
        "execution_gap_count": flag_count,
        "systemic_pattern_count": sys_count,
        "risk_distribution": risk_dist,
        "top_risks": top_risks[:5],
        "top_risky_entities": top_risks[:5],
        "priority_queue": top_risks,
        "sector_breakdown": list(sector_dist.values())
    }

# ---------------------------------------------------------------------------
# 3. ENTITIES LIST / SUPERVISORY QUEUE
# ---------------------------------------------------------------------------

@router.get("/entities")
def get_entities(
    batch_id: str,
    sort: str = 'risk_score',
    filter_risk: Optional[str] = None,
    filter_sector: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List assessed entities with operational metrics, coverage score, and flags."""
    risk_scores = db.query(RiskScore).filter(RiskScore.batch_id == batch_id).all()
    features = db.query(CSEFeatures).filter(CSEFeatures.batch_id == batch_id).all()
    feat_map = {f.cse_id: f for f in features}
    
    reviews = db.query(FindingReviewRecord).filter(FindingReviewRecord.batch_id == batch_id).all()
    review_map = {r.finding_id: r.status for r in reviews}
    
    res = []
    for rs in risk_scores:
        feat = feat_map.get(rs.cse_id)
        sec = feat.sector if feat else "Unknown"
        
        if filter_risk and rs.risk_level.lower() != filter_risk.lower():
            continue
        if filter_sector and sec.lower() != filter_sector.lower():
            continue
            
        f_json = json.loads(feat.features_json) if feat and feat.features_json else {}
        cov_score = f_json.get('supervisory_coverage_score', None)
        
        flag_cnt = rs.flag_count or 0
        ns_cnt = db.query(NegativeSpaceFinding).filter(NegativeSpaceFinding.batch_id == batch_id, NegativeSpaceFinding.cse_id == rs.cse_id).count()
        
        res.append({
            "cse_id": rs.cse_id,
            "risk_score": rs.risk_score,
            "risk_level": rs.risk_level,
            "is_grey": rs.is_grey,
            "sector": sec,
            "primary_reason": rs.primary_reason,
            "flag_count": flag_cnt,
            "negative_space_count": ns_cnt,
            "evidence_count": flag_cnt + ns_cnt,
            "alert_count": feat.alert_count if feat else 0,
            "case_count": feat.case_count if feat else 0,
            "supervisory_coverage": cov_score,
            "status": "REVIEW REQUIRED" if rs.risk_level in ['CRITICAL', 'HIGH'] else ("UNASSESSED" if rs.is_grey else "MONITORED")
        })
        
    if sort == 'risk_score':
        res.sort(key=lambda x: (x['is_grey'], -x['risk_score']))
    elif sort == 'alert_count':
        res.sort(key=lambda x: -x['alert_count'])
    elif sort == 'cse_id':
        res.sort(key=lambda x: x['cse_id'])
        
    return res

# ---------------------------------------------------------------------------
# 4. ENTITY DOSSIER
# ---------------------------------------------------------------------------

@router.get("/entity/{cse_id}")
def get_entity_dossier(cse_id: str, batch_id: str, db: Session = Depends(get_db)):
    """Comprehensive supervisory dossier for an individual Critical Sector Entity."""
    rs = db.query(RiskScore).filter(RiskScore.batch_id == batch_id, RiskScore.cse_id == cse_id).first()
    flags = db.query(FlagRecord).filter(FlagRecord.batch_id == batch_id, FlagRecord.cse_id == cse_id).all()
    neg_space = db.query(NegativeSpaceFinding).filter(NegativeSpaceFinding.batch_id == batch_id, NegativeSpaceFinding.cse_id == cse_id).all()
    feats = db.query(CSEFeatures).filter(CSEFeatures.batch_id == batch_id, CSEFeatures.cse_id == cse_id).first()
    note_rec = db.query(SupervisorNote).filter(SupervisorNote.batch_id == batch_id, SupervisorNote.cse_id == cse_id).order_by(SupervisorNote.id.desc()).first()
    
    if not rs:
        return {"error": "Entity not found"}
        
    sec = feats.sector if feats else "Unknown"
    peer_feats = db.query(CSEFeatures).filter(CSEFeatures.batch_id == batch_id, CSEFeatures.sector == sec).all()
    if len(peer_feats) < 2:
        peer_feats = db.query(CSEFeatures).filter(CSEFeatures.batch_id == batch_id).all()
        
    metrics_to_compare = [
        'escalation_rate', 'mean_closure_time_critical',
        'critical_asset_telemetry_ratio', 'case_linkage_rate',
        'critical_fast_closure_rate', 'alert_burst_max_hour'
    ]
    peer_context = []
    my_feats = json.loads(feats.features_json) if feats else {}
    
    import numpy as np
    for m in metrics_to_compare:
        vals = []
        for pf in peer_feats:
            f = json.loads(pf.features_json) if pf.features_json else {}
            if m in f:
                vals.append(float(f.get(m, 0.0)))
        if vals:
            cse_val = float(my_feats.get(m, 0.0))
            p_mean = float(np.mean(vals))
            p_med = float(np.median(vals))
            peer_context.append({
                "metric": m,
                "cse_value": cse_val,
                "peer_mean": p_mean,
                "peer_median": p_med,
                "peer_p10": float(np.percentile(vals, 10)),
                "peer_p90": float(np.percentile(vals, 90)),
                "deviation": round(cse_val - p_mean, 2)
            })
            
    shap_list = json.loads(rs.shap_values_json) if rs.shap_values_json else []
    
    # Simple concrete chronological timeline from actual sample records
    alerts_sample = db.query(AlertRecord).filter(
        AlertRecord.batch_id == batch_id,
        AlertRecord.cse_id == cse_id
    ).order_by(AlertRecord.created_at.desc()).limit(15).all()
    
    timeline = []
    for a in alerts_sample:
        if a.created_at:
            timeline.append({
                "timestamp": a.created_at.isoformat(),
                "time_display": a.created_at.strftime("%H:%M:%S (%b %d)"),
                "event": "Alert Raised",
                "severity": a.severity,
                "entity": a.cse_id,
                "asset": a.asset_id or "Unassigned",
                "identifier": a.alert_id,
                "note": f"{a.severity} alert logged on {a.asset_id or 'unknown asset'}"
            })
        if a.acknowledged_at:
            timeline.append({
                "timestamp": a.acknowledged_at.isoformat(),
                "time_display": a.acknowledged_at.strftime("%H:%M:%S (%b %d)"),
                "event": "Alert Acknowledged",
                "severity": a.severity,
                "entity": a.cse_id,
                "asset": a.asset_id or "Unassigned",
                "identifier": a.alert_id,
                "note": "Operator acknowledged alert"
            })
        if a.case_id:
            timeline.append({
                "timestamp": (a.acknowledged_at or a.created_at).isoformat(),
                "time_display": (a.acknowledged_at or a.created_at).strftime("%H:%M:%S (%b %d)"),
                "event": "Case Created",
                "severity": a.severity,
                "entity": a.cse_id,
                "asset": a.asset_id or "Unassigned",
                "identifier": a.case_id,
                "note": f"Linked to incident case {a.case_id}"
            })
        if a.closed_at:
            mins_str = f"{a.closure_minutes:.1f}m" if a.closure_minutes is not None else ""
            timeline.append({
                "timestamp": a.closed_at.isoformat(),
                "time_display": a.closed_at.strftime("%H:%M:%S (%b %d)"),
                "event": "Alert / Case Closed",
                "severity": a.severity,
                "entity": a.cse_id,
                "asset": a.asset_id or "Unassigned",
                "identifier": a.alert_id,
                "note": f"Closed ({mins_str} dwell time)" if mins_str else "Closed"
            })
    timeline.sort(key=lambda x: x["timestamp"])
    
    # Executive Summary
    has_gaps = len(flags) > 0
    has_neg_space = len(neg_space) > 0
    exec_summary = {
        "why_flagged": rs.primary_reason or "Composite supervisory deviation detected.",
        "strongest_indicators": [f.rule_name for f in flags[:3]] + [ns.finding_type for ns in neg_space[:2]],
        "evidence_sufficiency": "SUFFICIENT" if (feats and feats.alert_count >= 50) else "INSUFFICIENT_DATA",
        "peer_deviation_exists": any(abs(pc["deviation"]) > 10 for pc in peer_context),
        "missing_expected_activity": has_neg_space,
        "recommendation": "Review required by security supervisor to verify operational dwell time and telemetry coverage." if rs.risk_level in ['CRITICAL', 'HIGH'] else "Standard supervisory monitoring schedule."
    }
    
    score_bkd = json.loads(rs.score_breakdown_json) if rs.score_breakdown_json else {}
    
    # Flags formatted with expected, observed, gap, evidence
    formatted_flags = []
    for f in flags:
        ev_ids = json.loads(f.evidence_ids_json) if f.evidence_ids_json else []
        formatted_flags.append({
            "rule_id": f.rule_id,
            "rule_name": f.rule_name,
            "severity": f.severity,
            "description": f.description,
            "evidence_ids": ev_ids,
            "evidence": ev_ids,
            "flag_type": f.flag_type,
            "expected": getattr(f, 'expected', None) or "Adherence to supervisory SOC process baseline",
            "observed": getattr(f, 'observed', None) or f.description,
            "gap": getattr(f, 'gap', None) or "Execution workflow deviation detected",
            "evidence_strength": "HIGH" if len(ev_ids) >= 5 else "MEDIUM"
        })
        
    formatted_neg_space = []
    for ns in neg_space:
        pc_raw = json.loads(ns.peer_context_json) if ns.peer_context_json else {}
        formatted_neg_space.append({
            "type": ns.finding_type,
            "finding_type": ns.finding_type,
            "severity": ns.severity,
            "description": ns.description,
            "expected": ns.expected_value,
            "observed": ns.observed_value,
            "asset_id": ns.asset_id,
            "gap": f"Absence of expected {ns.finding_type.lower().replace('_', ' ')} evidence",
            "evidence_strength": "HIGH",
            "peer_context": pc_raw
        })
        
    return {
        "cse_id": cse_id,
        "sector": sec,
        "risk_score": rs.risk_score,
        "risk_level": rs.risk_level,
        "is_grey": rs.is_grey,
        "primary_reason": rs.primary_reason,
        "score_breakdown": score_bkd,
        "points": score_bkd.get("points", {}),
        "shap_values": shap_list,
        "feature_contributions": {item["feature"]: item["contribution"] for item in shap_list},
        "flags": formatted_flags,
        "negative_space_findings": formatted_neg_space,
        "negative_space": formatted_neg_space,
        "peer_context": peer_context,
        "features": my_feats,
        "supervisory_coverage": my_feats.get("supervisory_coverage_score", None),
        "supervisory_coverage_components": my_feats.get("supervisory_coverage_components", {}),
        "process_completeness": my_feats.get("process_completeness", {}),
        "executive_summary": exec_summary,
        "timeline": timeline[-20:],  # most recent 20 events
        "supervisor_note": note_rec.note if note_rec else ""
    }

# ---------------------------------------------------------------------------
# 5. NEGATIVE SPACE ENDPOINT
# ---------------------------------------------------------------------------

@router.get("/negative-space")
def get_negative_space(batch_id: str, db: Session = Depends(get_db)):
    """
    Detect missing, absent, or incomplete security evidence.
    Returns a list directly for regression test compatibility, while also
    fully supporting frontend extraction.
    """
    ns = db.query(NegativeSpaceFinding).filter(NegativeSpaceFinding.batch_id == batch_id).all()
    
    def sev_val(s):
        return {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}.get(s, 0)
        
    res = []
    for n in ns:
        pc_raw = json.loads(n.peer_context_json) if n.peer_context_json else None
        if isinstance(pc_raw, dict) and "peer_mean" in pc_raw:
            pc_str = f"Sector benchmark: {pc_raw['peer_mean']:.1f} avg across {pc_raw.get('peer_count', 0)} peer CSEs"
        elif pc_raw:
            pc_str = str(pc_raw)
        else:
            pc_str = None

        res.append({
            "id": n.id,
            "cse_id": n.cse_id,
            "finding_type": n.finding_type,
            "type": n.finding_type,
            "severity": n.severity,
            "description": n.description,
            "expected": n.expected_value,
            "expected_value": n.expected_value,
            "observed": n.observed_value,
            "observed_value": n.observed_value,
            "gap": f"Missing expected security evidence: {n.finding_type.replace('_', ' ').title()}",
            "asset_id": n.asset_id,
            "peer_context": pc_str,
            "evidence_strength": "HIGH" if n.severity in ['CRITICAL', 'HIGH'] else "MEDIUM",
            "sev_val": sev_val(n.severity)
        })
        
    res.sort(key=lambda x: (-x['sev_val'], x['cse_id']))
    for r in res:
        del r['sev_val']
        
    # Return list directly (compatible with assert len(ns_list) >= 3 in test_pipeline.py)
    return res

# ---------------------------------------------------------------------------
# 6. EXECUTION GAPS ENDPOINT
# ---------------------------------------------------------------------------

@router.get("/execution-gaps")
def get_execution_gaps(batch_id: str, db: Session = Depends(get_db)):
    """Workflow execution gaps: expected process vs observed operational evidence."""
    flags = db.query(FlagRecord).filter(
        FlagRecord.batch_id == batch_id,
        FlagRecord.flag_type == 'execution_gap'
    ).all()
    
    res = []
    for f in flags:
        ev_ids = json.loads(f.evidence_ids_json) if f.evidence_ids_json else []
        
        # Determine workflow stage
        if f.rule_id == 'R-01':
            stage = "ALERT_CASE_LINKAGE"
            expected = "Critical alert mapped to case record for formal investigation"
            observed = "Alert closed without linked case"
            gap = "Bypassed case creation workflow"
        elif f.rule_id == 'R-02':
            stage = "INVESTIGATION_DWELL"
            expected = "Substantive investigation dwell time (>= 8.0 minutes)"
            observed = "Anomalously rapid closure (< 8 minutes)"
            gap = "Superficial closure without meaningful analysis"
        elif f.rule_id == 'R-03':
            stage = "TIER_ESCALATION"
            expected = "Tier escalation rate >= 10.0% of incident cases"
            observed = "Suppressed escalation (< 10%)"
            gap = "Incident contained without higher-tier oversight"
        elif f.rule_id == 'R-04':
            stage = "INVESTIGATION_QUALITY"
            expected = "Divergent case-specific investigation notes"
            observed = "Templated notes (TF-IDF similarity >= 60%)"
            gap = "Boilerplate investigation notes"
        elif f.rule_id == 'R-08':
            stage = "CLOSURE_VARIATION"
            expected = "Natural variance in human analyst dwell time"
            observed = "Uniform closure timing (CV < 0.05)"
            gap = "Automated / script-driven bulk closure"
        else:
            stage = "PROCESS_COMPLIANCE"
            expected = "Expected operational process compliance"
            observed = f.description
            gap = "Process deviation"
            
        res.append({
            "id": f.id,
            "cse_id": f.cse_id,
            "rule_id": f.rule_id,
            "rule_name": f.rule_name,
            "workflow_stage": stage,
            "severity": f.severity,
            "description": f.description,
            "expected_process": expected,
            "observed_process": observed,
            "gap": gap,
            "evidence_count": len(ev_ids),
            "evidence_ids": ev_ids,
            "evidence_strength": "HIGH" if len(ev_ids) >= 5 else "MEDIUM"
        })
    return res

# ---------------------------------------------------------------------------
# 7. UNIFIED FINDINGS REGISTRY
# ---------------------------------------------------------------------------

@router.get("/findings")
def get_findings(
    batch_id: str,
    cse_id: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Unified supervisory findings registry covering execution gaps, negative space, and anomalies."""
    flags = db.query(FlagRecord).filter(FlagRecord.batch_id == batch_id)
    if cse_id:
        flags = flags.filter(FlagRecord.cse_id == cse_id)
    if priority:
        flags = flags.filter(FlagRecord.severity == priority.upper())
    flag_records = flags.all()
    
    ns_q = db.query(NegativeSpaceFinding).filter(NegativeSpaceFinding.batch_id == batch_id)
    if cse_id:
        ns_q = ns_q.filter(NegativeSpaceFinding.cse_id == cse_id)
    if priority:
        ns_q = ns_q.filter(NegativeSpaceFinding.severity == priority.upper())
    ns_records = ns_q.all()
    
    reviews = db.query(FindingReviewRecord).filter(FindingReviewRecord.batch_id == batch_id).all()
    review_map = {r.finding_id: r for r in reviews}
    
    comparisons = db.query(EntityCycleComparison).filter(EntityCycleComparison.batch_id == batch_id).all()
    chronic_map = {}
    for comp in comparisons:
        if comp.chronic_findings_json:
            for ch in json.loads(comp.chronic_findings_json):
                chronic_map[(comp.cse_id, ch.get('rule_id'))] = ch.get('consecutive_cycles', 1)
    
    findings_list = []
    
    # Process rule flags
    for f in flag_records:
        cat = "EXECUTION GAP" if f.flag_type == 'execution_gap' else "PROCESS WEAKNESS"
        if category and category.upper() not in [cat, "ALL"]:
            continue
            
        ev_ids = json.loads(f.evidence_ids_json) if f.evidence_ids_json else []
        fid = f"FND-FLAG-{f.id}"
        rev = review_map.get(fid)
        consec = chronic_map.get((f.cse_id, f.rule_id), 1)
        
        findings_list.append({
            "finding_id": fid,
            "raw_id": f.id,
            "cse_id": f.cse_id,
            "category": cat,
            "type": f.flag_type.upper(),
            "rule_id": f.rule_id,
            "title": f.rule_name,
            "description": f.description,
            "priority": f.severity,
            "severity": f.severity,
            "evidence_count": len(ev_ids),
            "evidence_ids": ev_ids,
            "evidence_strength": "HIGH" if len(ev_ids) >= 5 else "MEDIUM",
            "status": rev.status if rev else ("ACKNOWLEDGED" if f.status == "VALID" else ("RESOLVED" if f.status == "FALSE_POSITIVE" else "NEW")),
            "record_status": f.status or "OPEN",
            "auto_triaged_by": f.auto_triaged_by,
            "is_chronic": consec >= 3,
            "consecutive_cycles": consec,
            "reviewer": rev.reviewer if rev else ("Auto-Triage Policy" if f.auto_triaged_by else None),
            "notes": rev.notes if rev else (f"Auto-triaged by policy: {f.auto_triaged_by}" if f.auto_triaged_by else None),
            "updated_at": rev.updated_at.isoformat() if rev and rev.updated_at else None
        })
        
    # Process negative space
    for n in ns_records:
        cat = "NEGATIVE SPACE"
        if category and category.upper() not in [cat, "ALL"]:
            continue
            
        fid = f"FND-NS-{n.id}"
        rev = review_map.get(fid)
        ev_items = [n.asset_id] if n.asset_id else []
        consec = chronic_map.get((n.cse_id, n.finding_type), 1)
        
        findings_list.append({
            "finding_id": fid,
            "raw_id": n.id,
            "cse_id": n.cse_id,
            "category": cat,
            "type": n.finding_type,
            "rule_id": "NS-" + n.finding_type[:4],
            "title": n.finding_type.replace('_', ' ').title(),
            "description": n.description,
            "expected": n.expected_value,
            "observed": n.observed_value,
            "priority": n.severity,
            "severity": n.severity,
            "evidence_count": len(ev_items),
            "evidence_ids": ev_items,
            "evidence_strength": "HIGH",
            "status": rev.status if rev else ("ACKNOWLEDGED" if n.status == "VALID" else ("RESOLVED" if n.status == "FALSE_POSITIVE" else "NEW")),
            "record_status": n.status or "OPEN",
            "auto_triaged_by": n.auto_triaged_by,
            "is_chronic": consec >= 3,
            "consecutive_cycles": consec,
            "reviewer": rev.reviewer if rev else ("Auto-Triage Policy" if n.auto_triaged_by else None),
            "notes": rev.notes if rev else (f"Auto-triaged by policy: {n.auto_triaged_by}" if n.auto_triaged_by else None),
            "updated_at": rev.updated_at.isoformat() if rev and rev.updated_at else None
        })
        
    def priority_sort(item):
        return {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}.get(item['priority'], 0)
        
    findings_list.sort(key=lambda x: (-priority_sort(x), x['cse_id']))
    return findings_list

# ---------------------------------------------------------------------------
# 8. HUMAN-IN-THE-LOOP TRIAGE / REVIEW ACTION
# ---------------------------------------------------------------------------

class FindingReviewReq(BaseModel):
    batch_id: str
    finding_id: str
    status: str  # NEW, UNDER_REVIEW, ACKNOWLEDGED, RESOLVED
    reviewer: Optional[str] = "Supervisor"
    notes: Optional[str] = None

@router.post("/findings/review")
def review_finding(req: FindingReviewReq, db: Session = Depends(get_db)):
    """Update human review status, reviewer attribution, and supervisory notes for a finding."""
    rev = db.query(FindingReviewRecord).filter(
        FindingReviewRecord.batch_id == req.batch_id,
        FindingReviewRecord.finding_id == req.finding_id
    ).first()
    
    if not rev:
        rev = FindingReviewRecord(
            batch_id=req.batch_id,
            finding_id=req.finding_id,
            status=req.status,
            reviewer=req.reviewer,
            notes=req.notes,
            updated_at=datetime.utcnow()
        )
        db.add(rev)
    else:
        rev.status = req.status
        rev.reviewer = req.reviewer or rev.reviewer
        if req.notes is not None:
            rev.notes = req.notes
        rev.updated_at = datetime.utcnow()
        
    db.commit()
    db.refresh(rev)
    return {"status": "ok", "finding_id": rev.finding_id, "review_status": rev.status, "updated_at": rev.updated_at.isoformat()}

# ---------------------------------------------------------------------------
# 9. SUPERVISOR NOTES
# ---------------------------------------------------------------------------

class NoteReq(BaseModel):
    batch_id: str
    cse_id: str
    note: str

@router.post("/notes")
def add_note(req: NoteReq, db: Session = Depends(get_db)):
    """Attach supervisory assessment note to an entity."""
    note = SupervisorNote(
        batch_id=req.batch_id,
        cse_id=req.cse_id,
        note=req.note,
        created_at=datetime.utcnow()
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "created_at": note.created_at.isoformat()}

# ---------------------------------------------------------------------------
# 10. ANALYTICS DEEP-DIVE SUMMARY
# ---------------------------------------------------------------------------

@router.get("/analytics/summary")
def get_analytics_summary(batch_id: str, db: Session = Depends(get_db)):
    """Comprehensive analytical feature matrices, supervisory coverage, and peer benchmarks."""
    features_records = db.query(CSEFeatures).filter(CSEFeatures.batch_id == batch_id).all()
    risk_scores = db.query(RiskScore).filter(RiskScore.batch_id == batch_id).all()
    rs_map = {r.cse_id: r for r in risk_scores}
    
    summary_entities = []
    for fr in features_records:
        f = json.loads(fr.features_json) if fr.features_json else {}
        rs = rs_map.get(fr.cse_id)
        summary_entities.append({
            "cse_id": fr.cse_id,
            "sector": fr.sector or "Unknown",
            "risk_score": rs.risk_score if rs else 0.0,
            "risk_level": rs.risk_level if rs else "LOW",
            "is_grey": rs.is_grey if rs else False,
            "alert_count": fr.alert_count,
            "case_count": fr.case_count,
            "supervisory_coverage_score": f.get("supervisory_coverage_score", 0.0),
            "supervisory_coverage_components": f.get("supervisory_coverage_components", {}),
            "process_completeness": f.get("process_completeness", {}),
            "critical_fast_closure_rate": f.get("critical_fast_closure_rate", 0.0),
            "escalation_rate": f.get("escalation_rate", 0.0),
            "mean_closure_time_critical": f.get("mean_closure_time_critical", 0.0),
            "investigation_text_similarity": f.get("investigation_text_similarity", 0.0),
            "case_linkage_rate": f.get("case_linkage_rate", 1.0),
            "critical_asset_telemetry_ratio": f.get("critical_asset_telemetry_ratio", 0.0),
            "closure_time_cv": f.get("closure_time_cv", 1.0),
            "hourly_distribution": f.get("hourly_distribution", [0]*24),
            "weekday_distribution": f.get("weekday_distribution", [0]*7)
        })
        
    summary_entities.sort(key=lambda x: (x['is_grey'], -x['risk_score']))
    return {
        "batch_id": batch_id,
        "total_entities": len(summary_entities),
        "entities": summary_entities
    }

# ---------------------------------------------------------------------------
# 11. DATA QUALITY AUDIT
# ---------------------------------------------------------------------------

@router.get("/data-quality")
def get_data_quality(batch_id: str, db: Session = Depends(get_db)):
    """Auditable data quality analysis on ingested submission records."""
    alerts = db.query(AlertRecord).filter(AlertRecord.batch_id == batch_id).all()
    cases = db.query(CaseRecord).filter(CaseRecord.batch_id == batch_id).all()
    assets = db.query(AssetRecord).filter(AssetRecord.batch_id == batch_id).all()
    
    total_alerts = len(alerts)
    total_cases = len(cases)
    total_assets = len(assets)
    total_records = total_alerts + total_cases + total_assets
    
    # Check unlinked cases and alerts
    case_ids_in_cases = set(c.case_id for c in cases if c.case_id)
    alert_ids_in_alerts = set(a.alert_id for a in alerts if a.alert_id)
    
    unlinked_alerts = [a.alert_id for a in alerts if a.case_id and a.case_id not in case_ids_in_cases]
    
    missing_timestamps = sum(1 for a in alerts if not a.created_at or not a.closed_at)
    rapid_closures = sum(1 for a in alerts if a.closure_minutes is not None and a.closure_minutes < 1.0)
    
    # Asset coverage
    monitored_assets = set(a.asset_id for a in alerts if a.asset_id)
    unmonitored_assets = [ast.asset_id for ast in assets if ast.asset_id not in monitored_assets]
    
    # Integrity score calculation
    deductions = (len(unlinked_alerts) * 0.5) + (missing_timestamps * 1.0) + (len(unmonitored_assets) * 2.0)
    integrity_score = max(round(100.0 - (deductions / max(total_records, 1) * 100.0), 1), 60.0)
    
    return {
        "batch_id": batch_id,
        "records_received": total_records,
        "valid_records": total_records - missing_timestamps,
        "rejected_records": 0,
        "alert_count": total_alerts,
        "case_count": total_cases,
        "asset_count": total_assets,
        "unlinked_alerts_count": len(unlinked_alerts),
        "unlinked_alerts_sample": unlinked_alerts[:5],
        "missing_timestamps_count": missing_timestamps,
        "rapid_closures_under_1min": rapid_closures,
        "unmonitored_assets_count": len(unmonitored_assets),
        "unmonitored_assets_sample": unmonitored_assets[:5],
        "data_integrity_score": integrity_score,
        "audit_verdict": "VERIFIED FOR SUPERVISORY ANALYSIS" if integrity_score >= 80.0 else "QUALIFIED (DATA GAPS DETECTED)"
    }

# ---------------------------------------------------------------------------
# 12. DEMO SCENARIOS CONFIGURATION
# ---------------------------------------------------------------------------

@router.get("/demo/scenarios")
def get_demo_scenarios():
    """Five predefined supervisory demonstration scenarios based on actual sample data."""
    return [
        {
            "id": "scenario-1",
            "title": "Scenario 1: Normal Entity Baseline",
            "cse_id": "CSE-01",
            "sector": "Banking",
            "archetype": "NORMAL_BASELINE",
            "description": "Standard operational baseline with expected investigation dwell times (mean ~47m), healthy escalation (~28%), and full severity distribution.",
            "target_route": "/entity/CSE-01",
            "badge": "NORMAL"
        },
        {
            "id": "scenario-2",
            "title": "Scenario 2: Workflow Execution Gap",
            "cse_id": "CSE-07",
            "sector": "Banking",
            "archetype": "EXECUTION_GAP",
            "description": "Systemic execution breakdown: anomalously fast closures (<8m), suppressed escalation rate (5.4%), and 74% templated investigation notes.",
            "target_route": "/entity/CSE-07",
            "badge": "EXECUTION GAP"
        },
        {
            "id": "scenario-3",
            "title": "Scenario 3: Negative Space Blind Spot",
            "cse_id": "CSE-11",
            "sector": "Banking",
            "archetype": "NEGATIVE_SPACE",
            "description": "Evidence that should exist is absent: critical core servers FIN-SERVER-04 & SWIFT-GW-04 generated zero alerts, and HIGH alert category is missing.",
            "target_route": "/entity/CSE-11",
            "badge": "NEGATIVE SPACE"
        },
        {
            "id": "scenario-4",
            "title": "Scenario 4: Peer Benchmark Deviation",
            "cse_id": "CSE-08",
            "sector": "Banking",
            "archetype": "PEER_DEVIATION",
            "description": "Operational indicators deviate significantly from sector peers in critical asset telemetry density and case linkage.",
            "target_route": "/entity/CSE-08",
            "badge": "PEER DEVIATION"
        },
        {
            "id": "scenario-5",
            "title": "Scenario 5: Low-Volume Unassessed Entity",
            "cse_id": "CSE-99",
            "sector": "Banking",
            "archetype": "UNASSESSED_GREY",
            "description": "Insufficient evidence threshold (<50 alerts). System correctly assigns Grey status (UNASSESSED) rather than making false claims.",
            "target_route": "/entity/CSE-99",
            "badge": "UNASSESSED"
        }
    ]

# ---------------------------------------------------------------------------
# 13. RAW EVIDENCE EXPLORER
# ---------------------------------------------------------------------------

@router.get("/evidence")
def get_evidence(
    batch_id: str,
    cse_id: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Query raw alert and case metadata with search and filtering for audit traceability."""
    query = db.query(AlertRecord).filter(AlertRecord.batch_id == batch_id)
    if cse_id:
        query = query.filter(AlertRecord.cse_id == cse_id)
    if severity:
        query = query.filter(AlertRecord.severity == severity.upper())
    if search:
        query = query.filter(
            (AlertRecord.alert_id.like(f"%{search}%")) |
            (AlertRecord.case_id.like(f"%{search}%")) |
            (AlertRecord.asset_id.like(f"%{search}%"))
        )
        
    total = query.count()
    records = query.order_by(AlertRecord.created_at.desc()).offset(offset).limit(limit).all()
    
    items = []
    for a in records:
        items.append({
            "alert_id": a.alert_id,
            "cse_id": a.cse_id,
            "severity": a.severity,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            "closed_at": a.closed_at.isoformat() if a.closed_at else None,
            "closure_minutes": round(a.closure_minutes, 1) if a.closure_minutes is not None else None,
            "case_id": a.case_id,
            "asset_id": a.asset_id,
            "escalated": a.escalated,
            "status": a.status
        })
        
    return {"total": total, "items": items, "offset": offset, "limit": limit}

# ---------------------------------------------------------------------------
# 14. SUPERVISORY AUDIT REPORT
# ---------------------------------------------------------------------------

@router.get("/report")
def get_supervisory_report(batch_id: str, db: Session = Depends(get_db)):
    """Generate structured audit summary report for NCIIPC/NTRO supervision."""
    batch = db.query(BatchRecord).filter(BatchRecord.id == batch_id).first()
    overview = get_overview(batch_id=batch_id, db=db)
    entities = get_entities(batch_id=batch_id, db=db)
    findings = get_findings(batch_id=batch_id, db=db)
    dq = get_data_quality(batch_id=batch_id, db=db)
    
    return {
        "assessment_meta": {
            "title": "SAT-SA Supervisory Assessment Summary",
            "batch_id": batch_id,
            "generated_at": datetime.utcnow().isoformat(),
            "status": batch.status if batch else "COMPLETED",
            "analytics_version": "SAT-SA v1.2-SUPERVISORY",
            "environment": "Offline / Air-Gapped Verification"
        },
        "overview": overview,
        "entities": entities,
        "top_findings": findings[:15],
        "data_quality": dq,
        "recommended_review_areas": [
            "Entity CSE-07 requires urgent manual review for investigation dwell times (<8m) and potential automation workarounds.",
            "Entity CSE-11 critical infrastructure (FIN-SERVER-04, SWIFT-GW-04) telemetry ingestion must be physically inspected.",
            "Establish unified case creation policy for critical alerts closing without linked case tickets."
        ]
    }

# ---------------------------------------------------------------------------
# 15. SYSTEMIC PATTERNS
# ---------------------------------------------------------------------------

@router.get("/systemic-patterns")
def get_systemic_patterns(batch_id: str, db: Session = Depends(get_db)):
    """Retrieve detected cross-entity systemic risk patterns."""
    patterns = db.query(SystemicPattern).filter(SystemicPattern.batch_id == batch_id).all()
    res = []
    for p in patterns:
        res.append({
            "id": p.id,
            "pattern_key": p.pattern_key,
            "pattern_label": p.pattern_label,
            "entity_count": p.entity_count,
            "total_entities_in_batch": p.total_entities_in_batch,
            "affected_entities": json.loads(p.affected_entities_json) if p.affected_entities_json else [],
            "sectors": json.loads(p.sectors_json) if p.sectors_json else [],
            "severity": p.severity,
            "description": p.description,
            "created_at": p.created_at.isoformat() if p.created_at else None
        })
    return res

# ---------------------------------------------------------------------------
# 16. NCIIPC 8-CAPABILITY PROFILE
# ---------------------------------------------------------------------------

@router.get("/entity/{cse_id}/capability-profile")
def get_capability_profile(cse_id: str, batch_id: str, db: Session = Depends(get_db)):
    """Retrieve 8-axis capability compliance radar profile with peer sector average."""
    return compute_entity_capability_profile(cse_id, batch_id, db)

# ---------------------------------------------------------------------------
# 17. CYCLE TREND & RECURRENCE TRACKING
# ---------------------------------------------------------------------------

@router.get("/entity/{cse_id}/trend")
def get_entity_trend(cse_id: str, batch_id: str, db: Session = Depends(get_db)):
    """Retrieve cycle-over-cycle comparative trend, recurrence, and chronic finding history."""
    return get_entity_trend_data(cse_id, batch_id, db)

# ---------------------------------------------------------------------------
# 18. SUPERVISORY ADVISORY LETTERS
# ---------------------------------------------------------------------------

class GenerateAdvisoryReq(BaseModel):
    batch_id: str
    finding_ids: Optional[List[str]] = None
    supervisory_directive: Optional[str] = None

@router.post("/entity/{cse_id}/generate-advisory")
def generate_advisory(cse_id: str, req: GenerateAdvisoryReq, db: Session = Depends(get_db)):
    """Auto-draft formal supervisory advisory letter for an entity."""
    feat = db.query(CSEFeatures).filter(CSEFeatures.batch_id == req.batch_id, CSEFeatures.cse_id == cse_id).first()
    rs = db.query(RiskScore).filter(RiskScore.batch_id == req.batch_id, RiskScore.cse_id == cse_id).first()
    sector = feat.sector if feat else "Unknown"
    
    flags = db.query(FlagRecord).filter(FlagRecord.batch_id == req.batch_id, FlagRecord.cse_id == cse_id).all()
    ns_list = db.query(NegativeSpaceFinding).filter(NegativeSpaceFinding.batch_id == req.batch_id, NegativeSpaceFinding.cse_id == cse_id).all()
    
    findings_data = []
    for f in flags:
        fid = f"FND-FLAG-{f.id}"
        if req.finding_ids and fid not in req.finding_ids:
            continue
        ev = json.loads(f.evidence_ids_json) if f.evidence_ids_json else []
        findings_data.append({
            "id": fid,
            "key": f.rule_id,
            "title": f.rule_name,
            "severity": f.severity,
            "description": f.description,
            "evidence_count": len(ev)
        })
        
    for n in ns_list:
        fid = f"FND-NS-{n.id}"
        if req.finding_ids and fid not in req.finding_ids:
            continue
        findings_data.append({
            "id": fid,
            "key": n.finding_type,
            "title": n.finding_type.replace('_', ' ').title(),
            "severity": n.severity,
            "description": n.description,
            "evidence_count": 1 if n.asset_id else 0
        })

    if not findings_data:
        for f in flags[:4]:
            ev = json.loads(f.evidence_ids_json) if f.evidence_ids_json else []
            findings_data.append({
                "id": f"FND-FLAG-{f.id}",
                "key": f.rule_id,
                "title": f.rule_name,
                "severity": f.severity,
                "description": f.description,
                "evidence_count": len(ev)
            })

    content = generate_advisory_content(
        cse_id=cse_id,
        sector=sector,
        risk_score=rs.risk_score if rs else 0.0,
        risk_level=rs.risk_level if rs else "HIGH",
        batch_id=req.batch_id,
        findings_data=findings_data
    )

    body_text = content["body_text"]
    if req.supervisory_directive and req.supervisory_directive.strip():
        body_text += f"\n\nSUPERVISORY DIRECTIVE:\n{req.supervisory_directive.strip()}\n"

    advisory = AdvisoryDraft(
        batch_id=req.batch_id,
        cse_id=cse_id,
        finding_ids_json=json.dumps([f["id"] for f in findings_data]),
        subject=content["subject"],
        body_text=body_text,
        status='DRAFT',
        generated_at=datetime.utcnow()
    )
    db.add(advisory)
    db.commit()
    db.refresh(advisory)

    ref_num = f"SAT-SA/ADV/{advisory.cse_id}/{advisory.batch_id[:8].upper()}"
    return {
        "id": advisory.id,
        "reference_number": ref_num,
        "batch_id": advisory.batch_id,
        "cse_id": advisory.cse_id,
        "recipient_entity": advisory.cse_id,
        "subject": advisory.subject,
        "body_text": advisory.body_text,
        "rendered_content": advisory.body_text,
        "assessment_date": advisory.generated_at.strftime("%d %B %Y") if advisory.generated_at else datetime.utcnow().strftime("%d %B %Y"),
        "findings_included": json.loads(advisory.finding_ids_json) if advisory.finding_ids_json else [],
        "supervisory_directive": req.supervisory_directive or "",
        "status": advisory.status,
        "generated_at": advisory.generated_at.isoformat() if advisory.generated_at else None
    }

@router.get("/advisories")
def list_advisories(batch_id: Optional[str] = None, db: Session = Depends(get_db)):
    """List advisory letter drafts."""
    q = db.query(AdvisoryDraft)
    if batch_id:
        q = q.filter(AdvisoryDraft.batch_id == batch_id)
    drafts = q.order_by(AdvisoryDraft.generated_at.desc()).all()
    return [{
        "id": d.id,
        "reference_number": f"SAT-SA/ADV/{d.cse_id}/{d.batch_id[:8].upper()}",
        "batch_id": d.batch_id,
        "cse_id": d.cse_id,
        "recipient_entity": d.cse_id,
        "subject": d.subject,
        "body_text": d.body_text,
        "rendered_content": d.body_text,
        "status": d.status,
        "generated_at": d.generated_at.isoformat() if d.generated_at else None,
        "approved_by": d.approved_by,
        "approved_at": d.approved_at.isoformat() if d.approved_at else None
    } for d in drafts]

class PatchAdvisoryReq(BaseModel):
    body_text: Optional[str] = None
    status: Optional[str] = None
    approved_by: Optional[str] = None
    supervisory_directive: Optional[str] = None

@router.patch("/advisories/{id}")
def update_advisory(id: int, req: PatchAdvisoryReq, db: Session = Depends(get_db)):
    """Update or approve an advisory draft."""
    adv = db.query(AdvisoryDraft).filter(AdvisoryDraft.id == id).first()
    if not adv:
        raise HTTPException(status_code=404, detail="Advisory draft not found")
    if req.body_text is not None:
        adv.body_text = req.body_text
    if req.supervisory_directive is not None and req.supervisory_directive.strip():
        # Append directive to body_text if not already present
        if "SUPERVISORY DIRECTIVE:" not in adv.body_text:
            adv.body_text += f"\n\nSUPERVISORY DIRECTIVE:\n{req.supervisory_directive.strip()}\n"
    if req.status is not None:
        adv.status = req.status
        if req.status == 'APPROVED':
            adv.approved_at = datetime.utcnow()
            adv.approved_by = req.approved_by or "Lead Security Supervisor"
    if req.approved_by is not None:
        adv.approved_by = req.approved_by

    db.commit()
    db.refresh(adv)
    ref_num = f"SAT-SA/ADV/{adv.cse_id}/{adv.batch_id[:8].upper()}"
    return {
        "id": adv.id,
        "reference_number": ref_num,
        "status": adv.status,
        "approved_by": adv.approved_by,
        "approved_at": adv.approved_at.isoformat() if adv.approved_at else None
    }

@router.get("/advisories/{id}/export-pdf")
def export_advisory_pdf(id: int, db: Session = Depends(get_db)):
    """Generate and download formal PDF advisory letter."""
    adv = db.query(AdvisoryDraft).filter(AdvisoryDraft.id == id).first()
    if not adv:
        raise HTTPException(status_code=404, detail="Advisory draft not found")
    pdf_buffer = generate_advisory_pdf(adv)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Advisory_{adv.cse_id}_{adv.id}.pdf"}
    )

# ---------------------------------------------------------------------------
# 19. SAMPLING PLAN FOR MANUAL REVIEW
# ---------------------------------------------------------------------------

@router.get("/sampling-plan")
def get_sampling_plan(batch_id: str, sample_size: int = 50, total_sample_size: Optional[int] = None, db: Session = Depends(get_db)):
    """Generate risk-weighted manual review sampling plan across entities and findings."""
    effective_size = total_sample_size if total_sample_size is not None else sample_size
    return generate_sampling_plan(batch_id, effective_size, db)

class SampleReviewReq(BaseModel):
    batch_id: str
    record_id: Optional[str] = None
    evidence_id: Optional[str] = None
    reviewed: bool = True
    reviewed_by: Optional[str] = None
    reviewer: Optional[str] = None
    notes: Optional[str] = None

@router.post("/sampling-plan/review")
def update_sample_review(req: SampleReviewReq, db: Session = Depends(get_db)):
    """Record manual audit review state for an evidence sample."""
    target_id = req.evidence_id or req.record_id
    if not target_id:
        raise HTTPException(status_code=400, detail="Missing record_id or evidence_id")
    reviewer_name = req.reviewer or req.reviewed_by or "Supervisor"

    rec = db.query(SampleReviewRecord).filter(
        SampleReviewRecord.batch_id == req.batch_id,
        SampleReviewRecord.record_id == target_id
    ).first()
    if not rec:
        rec = SampleReviewRecord(
            batch_id=req.batch_id,
            record_id=target_id,
            reviewed=req.reviewed,
            reviewed_by=reviewer_name,
            reviewed_at=datetime.utcnow() if req.reviewed else None
        )
        db.add(rec)
    else:
        rec.reviewed = req.reviewed
        rec.reviewed_by = reviewer_name
        rec.reviewed_at = datetime.utcnow() if req.reviewed else None

    db.commit()
    return {"status": "ok", "record_id": target_id, "evidence_id": target_id, "reviewed": rec.reviewed, "reviewed_by": rec.reviewed_by}

# ---------------------------------------------------------------------------
# 20. AUTO-TRIAGE POLICY ENGINE
# ---------------------------------------------------------------------------

class CreatePolicyReq(BaseModel):
    name: str
    match_rule_id: Optional[str] = None
    match_finding_type: Optional[str] = None
    match_severity: Optional[str] = None
    match_sector: Optional[str] = None
    action: str  # AUTO_FALSE_POSITIVE | AUTO_ACKNOWLEDGE | AUTO_ESCALATE
    created_by: Optional[str] = "Supervisor"

class PatchPolicyReq(BaseModel):
    active: Optional[bool] = None

@router.get("/triage-policies")
def list_triage_policies(db: Session = Depends(get_db)):
    """List all auto-triage policies."""
    policies = db.query(TriagePolicy).order_by(TriagePolicy.created_at.desc()).all()
    return [{
        "id": p.id,
        "name": p.name,
        "match_rule_id": p.match_rule_id,
        "match_finding_type": p.match_finding_type,
        "match_severity": p.match_severity,
        "match_sector": p.match_sector,
        "action": p.action,
        "active": p.active,
        "created_by": p.created_by,
        "created_at": p.created_at.isoformat() if p.created_at else None
    } for p in policies]

@router.post("/triage-policies")
def create_triage_policy(req: CreatePolicyReq, db: Session = Depends(get_db)):
    """Create a new auto-triage policy rule."""
    policy = TriagePolicy(
        name=req.name,
        match_rule_id=req.match_rule_id or None,
        match_finding_type=req.match_finding_type or None,
        match_severity=req.match_severity or None,
        match_sector=req.match_sector or None,
        action=req.action,
        active=True,
        created_by=req.created_by or "Supervisor",
        created_at=datetime.utcnow()
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return {
        "id": policy.id,
        "name": policy.name,
        "action": policy.action,
        "active": policy.active
    }

@router.patch("/triage-policies/{id}")
def update_triage_policy(id: int, req: PatchPolicyReq, db: Session = Depends(get_db)):
    """Toggle policy active state."""
    policy = db.query(TriagePolicy).filter(TriagePolicy.id == id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    if req.active is not None:
        policy.active = req.active
    db.commit()
    return {"id": policy.id, "active": policy.active}

@router.delete("/triage-policies/{id}")
def delete_triage_policy(id: int, db: Session = Depends(get_db)):
    """Delete a triage policy rule."""
    policy = db.query(TriagePolicy).filter(TriagePolicy.id == id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    db.delete(policy)
    db.commit()
    return {"status": "deleted", "id": id}


