import json
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models.orm import AlertRecord, CaseRecord, AssetRecord

def compute_features(cse_id: str, batch_id: str, db: Session) -> dict:
    """
    Compute comprehensive SOC supervisory feature vector for a CSE.
    Maintains 100% backward compatibility with baseline features while expanding
    into the 7 core supervisory operational categories:
    A. Alert Features
    B. Investigation Features
    C. Escalation Features
    D. Closure Features
    E. Asset Coverage Features
    F. Temporal Features
    G. Supervisory Coverage & Process Completeness
    """
    
    alerts = db.query(AlertRecord).filter(
        AlertRecord.batch_id == batch_id,
        AlertRecord.cse_id == cse_id
    ).all()
    
    cases = db.query(CaseRecord).filter(
        CaseRecord.batch_id == batch_id,
        CaseRecord.cse_id == cse_id
    ).all()
    
    assets = db.query(AssetRecord).filter(
        AssetRecord.batch_id == batch_id,
        AssetRecord.cse_id == cse_id
    ).all()
    
    alert_count = len(alerts)
    case_count = len(cases)
    asset_count = len(assets)
    
    critical_alerts = [a for a in alerts if a.severity == 'CRITICAL']
    high_alerts = [a for a in alerts if a.severity == 'HIGH']
    med_alerts = [a for a in alerts if a.severity == 'MEDIUM']
    low_alerts = [a for a in alerts if a.severity == 'LOW']
    
    # -------------------------------------------------------------
    # 1. BASELINE CORE FEATURES (preserved for rules & scoring)
    # -------------------------------------------------------------
    
    # Feature 1: critical_fast_closure_rate
    fast_closed = [a for a in critical_alerts 
                   if a.closure_minutes is not None and a.closure_minutes < 8]
    critical_fast_closure_rate = len(fast_closed) / len(critical_alerts) if critical_alerts else 0.0
    
    # Feature 2: escalation_rate
    escalated_cases = [c for c in cases if c.escalated is True]
    escalation_rate = len(escalated_cases) / len(cases) if cases else 0.0
    
    # Feature 3: mean_closure_time_critical
    closure_times = [a.closure_minutes for a in critical_alerts 
                     if a.closure_minutes is not None]
    mean_closure_time_critical = float(np.mean(closure_times)) if closure_times else 0.0
    median_closure_time_critical = float(np.median(closure_times)) if closure_times else 0.0
    
    # Feature 4: investigation_text_similarity (filled by text_similarity.py in pipeline)
    investigation_text_similarity = 0.0
    
    # Feature 5: case_linkage_rate
    linked = [a for a in critical_alerts if a.case_id is not None]
    case_linkage_rate = len(linked) / len(critical_alerts) if critical_alerts else 1.0
    
    # Feature 6: alert_category_coverage
    severity_levels = set(a.severity for a in alerts)
    alert_category_coverage = float(len(severity_levels))
    
    # Feature 7: critical_asset_telemetry_ratio
    critical_assets = [a for a in assets if a.classification == 'CRITICAL']
    critical_asset_ids = set(ca.asset_id for ca in critical_assets)
    
    dates = [a.created_at for a in alerts if a.created_at is not None]
    if dates:
        span_days = max((max(dates) - min(dates)).days, 1)
    else:
        span_days = 90
        
    if critical_assets:
        alerts_from_critical = [a for a in alerts if a.asset_id in critical_asset_ids]
        ratio = (len(alerts_from_critical) / len(critical_assets)) * (30 / span_days)
        critical_asset_telemetry_ratio = float(ratio)
    else:
        critical_asset_telemetry_ratio = float(len(alerts)) / 30.0  # fallback
    
    # Feature 8: low_activity_window_count
    low_activity_window_count = 0.0
    longest_inactivity_hours = 0.0
    if dates:
        sorted_dates = sorted(dates)
        min_date = sorted_dates[0]
        max_date = sorted_dates[-1]
        span_days = max((max_date - min_date).days, 7)
        num_weeks = max(span_days // 7, 1)
        mean_weekly = len(alerts) / num_weeks
        for i in range(num_weeks):
            window_start = min_date + timedelta(days=i*7)
            window_end = window_start + timedelta(days=7)
            window_count = sum(1 for d in dates if window_start <= d < window_end)
            if window_count < 0.05 * mean_weekly:
                low_activity_window_count += 1
                
        # Inactivity gaps
        gaps = [(sorted_dates[i+1] - sorted_dates[i]).total_seconds() / 3600.0 for i in range(len(sorted_dates)-1)]
        longest_inactivity_hours = float(max(gaps)) if gaps else 0.0
    
    # Feature 9: closure_time_cv
    if len(closure_times) >= 2:
        cv = float(np.std(closure_times) / np.mean(closure_times)) if np.mean(closure_times) > 0 else 0.0
        closure_time_cv = cv
    else:
        closure_time_cv = 1.0  # neutral
        
    # Peer ranks (placeholders filled by statistical.py)
    peer_escalation_percentile = 50.0
    peer_closure_time_percentile = 50.0
    
    # -------------------------------------------------------------
    # 2. EXPANDED ALERT FEATURES
    # -------------------------------------------------------------
    critical_ratio = len(critical_alerts) / alert_count if alert_count else 0.0
    high_ratio = len(high_alerts) / alert_count if alert_count else 0.0
    med_ratio = len(med_alerts) / alert_count if alert_count else 0.0
    low_ratio = len(low_alerts) / alert_count if alert_count else 0.0
    
    # Alert Burst Rate: max alerts within any 1-hour window
    burst_max_hour = 0
    if dates:
        hour_buckets = {}
        for d in dates:
            bucket_key = d.strftime('%Y-%m-%d-%H')
            hour_buckets[bucket_key] = hour_buckets.get(bucket_key, 0) + 1
        burst_max_hour = max(hour_buckets.values()) if hour_buckets else 0
        
    alert_to_case_ratio = (case_count / alert_count) if alert_count else 0.0
    
    # -------------------------------------------------------------
    # 3. EXPANDED INVESTIGATION FEATURES
    # -------------------------------------------------------------
    investigation_coverage = (len([a for a in alerts if a.case_id]) / alert_count) if alert_count else 0.0
    critical_investigation_coverage = case_linkage_rate
    
    # Start delays: alert created_at to case opened_at (or acknowledged_at)
    ack_delays = []
    for a in alerts:
        if a.acknowledged_at and a.created_at and a.acknowledged_at >= a.created_at:
            ack_delays.append((a.acknowledged_at - a.created_at).total_seconds() / 60.0)
    mean_ack_delay_min = float(np.mean(ack_delays)) if ack_delays else 0.0
    
    case_durations = []
    unclosed_cases = 0
    for c in cases:
        if c.opened_at and c.closed_at and c.closed_at >= c.opened_at:
            case_durations.append((c.closed_at - c.opened_at).total_seconds() / 60.0)
        elif c.opened_at and not c.closed_at:
            unclosed_cases += 1
    mean_case_duration_min = float(np.mean(case_durations)) if case_durations else 0.0
    investigation_abandonment_rate = (unclosed_cases / case_count) if case_count else 0.0
    
    # -------------------------------------------------------------
    # 4. EXPANDED ESCALATION FEATURES
    # -------------------------------------------------------------
    critical_escalated = [a for a in critical_alerts if a.escalated is True]
    critical_escalation_rate = (len(critical_escalated) / len(critical_alerts)) if critical_alerts else 0.0
    escalation_omission_rate = max(1.0 - critical_escalation_rate, 0.0) if critical_alerts else 0.0
    
    # -------------------------------------------------------------
    # 5. EXPANDED CLOSURE FEATURES
    # -------------------------------------------------------------
    closed_alerts = [a for a in alerts if a.status == 'CLOSED']
    closure_rate = (len(closed_alerts) / alert_count) if alert_count else 0.0
    all_closure_times = [a.closure_minutes for a in alerts if a.closure_minutes is not None]
    overall_mean_closure_time = float(np.mean(all_closure_times)) if all_closure_times else 0.0
    rapid_closure_count = len(fast_closed)
    
    # -------------------------------------------------------------
    # 6. EXPANDED ASSET COVERAGE FEATURES
    # -------------------------------------------------------------
    alert_asset_ids = set(a.asset_id for a in alerts if a.asset_id)
    all_asset_ids = set(ast.asset_id for ast in assets)
    monitored_assets = alert_asset_ids.intersection(all_asset_ids)
    monitored_asset_ratio = (len(monitored_assets) / asset_count) if asset_count else (1.0 if alert_count > 0 else 0.0)
    silent_critical_assets = [ca.asset_id for ca in critical_assets if ca.asset_id not in alert_asset_ids]
    silent_critical_asset_count = len(silent_critical_assets)
    
    # -------------------------------------------------------------
    # 7. TEMPORAL FEATURES & ACTIVITY PROFILES
    # -------------------------------------------------------------
    hourly_counts = [0] * 24
    weekday_counts = [0] * 7
    business_hour_count = 0
    weekday_total = 0
    weekend_total = 0
    
    for d in dates:
        hourly_counts[d.hour] += 1
        weekday_counts[d.weekday()] += 1
        if d.weekday() < 5:
            weekday_total += 1
            if 9 <= d.hour < 18:
                business_hour_count += 1
        else:
            weekend_total += 1
            
    business_hours_ratio = (business_hour_count / weekday_total) if weekday_total else 0.5
    weekday_weekend_ratio = (weekday_total / max(weekend_total, 1)) if weekend_total else 5.0
    
    # -------------------------------------------------------------
    # 8. SUPERVISORY COVERAGE SCORE (0 - 100%)
    # -------------------------------------------------------------
    # Measures whether available operational evidence covers expected monitoring surfaces
    # Labeled as an analytical indicator, not ground truth
    asset_cov_part = monitored_asset_ratio * 100.0
    telemetry_cov_part = min(critical_asset_telemetry_ratio / 5.0, 1.0) * 100.0 if critical_assets else 85.0
    category_cov_part = (alert_category_coverage / 4.0) * 100.0
    investigation_cov_part = investigation_coverage * 100.0
    escalation_cov_part = min(escalation_rate / 0.20, 1.0) * 100.0 if cases else 50.0
    closure_evid_part = max(1.0 - critical_fast_closure_rate, 0.0) * 100.0
    
    supervisory_coverage_score = round(
        0.20 * asset_cov_part +
        0.20 * telemetry_cov_part +
        0.15 * category_cov_part +
        0.20 * investigation_cov_part +
        0.10 * escalation_cov_part +
        0.15 * closure_evid_part,
        1
    )
    
    # -------------------------------------------------------------
    # 9. PROCESS COMPLETENESS (Sequential stages)
    # -------------------------------------------------------------
    resolved_cases = len([c for c in cases if c.resolution and c.resolution.strip()])
    case_resolution_rate = (resolved_cases / case_count) if case_count else 0.0
    
    process_completeness = {
        "alert_stage": {
            "name": "Alert Ingestion",
            "present": alert_count > 0,
            "rate": 100.0 if alert_count > 0 else 0.0,
            "count": alert_count,
            "status": "COMPLETE" if alert_count > 0 else "ABSENT"
        },
        "case_stage": {
            "name": "Case Creation",
            "present": case_count > 0,
            "rate": round(investigation_coverage * 100.0, 1),
            "count": case_count,
            "status": "COMPLETE" if investigation_coverage >= 0.75 else ("PARTIAL" if investigation_coverage >= 0.25 else "GAP")
        },
        "investigation_stage": {
            "name": "Investigation Activity",
            "present": case_count > 0 and mean_case_duration_min > 5.0,
            "rate": round(max(1.0 - critical_fast_closure_rate, 0.0) * 100.0, 1),
            "duration_min": round(mean_case_duration_min, 1),
            "status": "COMPLETE" if critical_fast_closure_rate < 0.20 else "SUSPICIOUS_RAPID"
        },
        "escalation_stage": {
            "name": "Tier Escalation",
            "present": len(escalated_cases) > 0,
            "rate": round(escalation_rate * 100.0, 1),
            "count": len(escalated_cases),
            "status": "COMPLETE" if escalation_rate >= 0.10 else "LOW_RATE"
        },
        "resolution_stage": {
            "name": "Case Resolution",
            "present": resolved_cases > 0,
            "rate": round(case_resolution_rate * 100.0, 1),
            "count": resolved_cases,
            "status": "COMPLETE" if case_resolution_rate >= 0.70 else "INCOMPLETE"
        },
        "closure_evidence_stage": {
            "name": "Closure Evidence Quality",
            "present": len(closed_alerts) > 0 and critical_fast_closure_rate < 0.50,
            "rate": round(closure_rate * 100.0, 1),
            "count": len(closed_alerts),
            "status": "COMPLETE" if closure_time_cv >= 0.05 and critical_fast_closure_rate < 0.25 else "EVIDENCE_GAP"
        }
    }

    return {
        # Core baseline features (preserving exact names for existing code)
        'critical_fast_closure_rate': critical_fast_closure_rate,
        'escalation_rate': escalation_rate,
        'mean_closure_time_critical': mean_closure_time_critical,
        'investigation_text_similarity': investigation_text_similarity,
        'case_linkage_rate': case_linkage_rate,
        'alert_category_coverage': alert_category_coverage,
        'critical_asset_telemetry_ratio': critical_asset_telemetry_ratio,
        'low_activity_window_count': low_activity_window_count,
        'closure_time_cv': closure_time_cv,
        'peer_escalation_percentile': peer_escalation_percentile,
        'peer_closure_time_percentile': peer_closure_time_percentile,

        # Expanded Alert Features
        'alert_count': alert_count,
        'critical_alert_count': len(critical_alerts),
        'high_alert_count': len(high_alerts),
        'medium_alert_count': len(med_alerts),
        'low_alert_count': len(low_alerts),
        'critical_ratio': round(critical_ratio, 4),
        'high_ratio': round(high_ratio, 4),
        'medium_ratio': round(med_ratio, 4),
        'low_ratio': round(low_ratio, 4),
        'alert_burst_max_hour': burst_max_hour,
        'alert_to_case_ratio': round(alert_to_case_ratio, 4),

        # Expanded Investigation Features
        'investigation_coverage': round(investigation_coverage, 4),
        'critical_investigation_coverage': round(critical_investigation_coverage, 4),
        'mean_ack_delay_min': round(mean_ack_delay_min, 2),
        'mean_case_duration_min': round(mean_case_duration_min, 2),
        'investigation_abandonment_rate': round(investigation_abandonment_rate, 4),

        # Expanded Escalation Features
        'critical_escalation_rate': round(critical_escalation_rate, 4),
        'escalation_omission_rate': round(escalation_omission_rate, 4),

        # Expanded Closure Features
        'closure_rate': round(closure_rate, 4),
        'median_closure_time_critical': round(median_closure_time_critical, 2),
        'overall_mean_closure_time': round(overall_mean_closure_time, 2),
        'rapid_closure_count': rapid_closure_count,

        # Expanded Asset Coverage Features
        'total_assets_count': asset_count,
        'critical_assets_count': len(critical_assets),
        'monitored_asset_ratio': round(monitored_asset_ratio, 4),
        'silent_critical_asset_count': silent_critical_asset_count,
        'silent_critical_assets': silent_critical_assets,

        # Temporal Features
        'business_hours_ratio': round(business_hours_ratio, 4),
        'weekday_weekend_ratio': round(weekday_weekend_ratio, 2),
        'longest_inactivity_hours': round(longest_inactivity_hours, 1),
        'hourly_distribution': hourly_counts,
        'weekday_distribution': weekday_counts,

        # Supervisory Coverage & Completeness
        'supervisory_coverage_score': supervisory_coverage_score,
        'supervisory_coverage_components': {
            'asset_coverage': round(asset_cov_part, 1),
            'telemetry_coverage': round(telemetry_cov_part, 1),
            'alert_category_coverage': round(category_cov_part, 1),
            'investigation_coverage': round(investigation_cov_part, 1),
            'escalation_coverage': round(escalation_cov_part, 1),
            'closure_evidence_coverage': round(closure_evid_part, 1)
        },
        'process_completeness': process_completeness
    }

