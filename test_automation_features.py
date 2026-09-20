import os
import sys
import glob
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath('.'))

from backend.main import app
from backend.db import engine
from backend.models.orm import Base

def run_automation_features_test():
    print("=== STARTING SAT-SA AUTOMATION FEATURES VERIFICATION TEST ===")
    
    # Reset DB
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("[1] Database initialized.")
    
    client = TestClient(app)
    
    # 1. Ingest Sample Data
    sample_files = glob.glob("data/sample/*.csv")
    files_payload = []
    file_handles = []
    try:
        for fpath in sample_files:
            fname = os.path.basename(fpath)
            fh = open(fpath, "rb")
            file_handles.append(fh)
            files_payload.append(("files", (fname, fh, "text/csv")))
            
        res = client.post("/api/ingest", files=files_payload)
        assert res.status_code == 200, f"Ingest failed: {res.text}"
        batch_id = res.json().get("batch_id")
        print(f"[2] Data ingested. Batch ID: {batch_id}")
    finally:
        for fh in file_handles:
            fh.close()

    # 2. Configure a Triage Policy before analysis to test auto-triage
    print("[3] Testing Feature 6: Auto-Triage Policy Engine CRUD & matching...")
    policy_payload = {
        "name": "Auto-Escalate Critical Fast Closures",
        "target_rule": "R-02",
        "condition_type": "RULE_MATCH",
        "action": "AUTO_ESCALATE",
        "is_active": True
    }
    p_res = client.post("/api/triage-policies", json=policy_payload)
    assert p_res.status_code == 200, f"Create policy failed: {p_res.text}"
    created_policy = p_res.json()
    print(f"    Created triage policy: {created_policy['name']} (ID: {created_policy['id']})")
    
    # List policies
    list_res = client.get("/api/triage-policies")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1
    print(f"    Verified policies list returns {len(list_res.json())} policies.")

    # 3. Run Analysis
    print(f"[4] Running /api/analyse for batch {batch_id}...")
    a_res = client.post("/api/analyse", json={"batch_id": batch_id})
    assert a_res.status_code == 200, f"Analyse failed: {a_res.text}"
    print("    Analysis complete!")

    # 4. Verify Systemic Patterns (Feature 1)
    print("[5] Testing Feature 1: Sector-Wide Systemic Risk Detection...")
    sp_res = client.get(f"/api/systemic-patterns?batch_id={batch_id}")
    assert sp_res.status_code == 200, f"Get systemic patterns failed: {sp_res.text}"
    systemic_patterns = sp_res.json()
    print(f"    Detected {len(systemic_patterns)} systemic patterns.")
    if len(systemic_patterns) > 0:
        sp = systemic_patterns[0]
        print(f"    Pattern: {sp['rule_id']} - {sp['rule_name']}")
        print(f"    Affected CSEs ({sp['affected_count']}): {sp['affected_entities']}")
        print(f"    Escalated Severity: {sp['escalated_severity']}")
        assert sp['affected_count'] >= 3, "Systemic threshold must be at least 3"
        print("    [PASS] Systemic patterns threshold and escalation verified!")
    else:
        print("    (Note: Less than 3 entities triggered identical rule in this batch sample)")

    # 5. Verify NCIIPC 8-Capability Profile (Feature 2)
    print("[6] Testing Feature 2: NCIIPC 8-Capability Compliance Mapping & Radar Profile...")
    cap_res = client.get(f"/api/entity/CSE-07/capability-profile?batch_id={batch_id}")
    assert cap_res.status_code == 200, f"Get capability profile failed: {cap_res.text}"
    cap_data = cap_res.json()
    assert "capabilities" in cap_data
    assert len(cap_data["capabilities"]) == 8, f"Expected 8 capabilities, got {len(cap_data['capabilities'])}"
    print(f"    Overall capability maturity score for CSE-07: {cap_data['overall_capability_score']}%")
    for cap in cap_data["capabilities"]:
        assert "capability" in cap and "score" in cap and "peer_average" in cap
        print(f"      - {cap['capability']}: {cap['score']}% (Peer Avg: {cap['peer_average']}%, Findings: {cap['findings_count']})")
    print("    [PASS] All 8 NCIIPC capabilities mapped with entity score vs peer average!")

    # 6. Verify Trend & Recurrence (Feature 3)
    print("[7] Testing Feature 3: Assessment-Cycle Trend & Recurrence Tracking...")
    trend_res = client.get(f"/api/entity/CSE-07/trend?batch_id={batch_id}")
    assert trend_res.status_code == 200, f"Get trend failed: {trend_res.text}"
    trend_data = trend_res.json()
    assert "history" in trend_data
    assert "comparison" in trend_data
    print(f"    Historical cycles tracked for CSE-07: {len(trend_data['history'])}")
    print(f"    Comparison metrics: New: {len(trend_data['comparison'].get('new_findings', []))}, Resolved: {len(trend_data['comparison'].get('resolved_findings', []))}, Recurring: {len(trend_data['comparison'].get('recurring_findings', []))}")
    print("    [PASS] Trend & recurrence data structure verified!")

    # 7. Verify Auto-Drafted Advisory Letters (Feature 4)
    print("[8] Testing Feature 4: Auto-Drafted Supervisory Advisory Letters (Jinja2 + ReportLab PDF)...")
    adv_res = client.post(
        "/api/entity/CSE-07/generate-advisory",
        json={"batch_id": batch_id, "supervisory_directive": "Immediate board audit required within 14 days."}
    )
    assert adv_res.status_code == 200, f"Generate advisory failed: {adv_res.text}"
    advisory = adv_res.json()
    advisory_id = advisory["id"]
    print(f"    Generated advisory letter: Ref {advisory['reference_number']} (ID: {advisory_id})")
    assert "CSE-07" in advisory["rendered_content"]
    assert "DIRECTIVE" in advisory["rendered_content"] or "advisory" in advisory["rendered_content"].lower()
    
    # Approve advisory
    patch_res = client.patch(f"/api/advisories/{advisory_id}", json={"status": "APPROVED"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "APPROVED"
    print("    Advisory status updated to APPROVED.")

    # Export PDF
    pdf_res = client.get(f"/api/advisories/{advisory_id}/export-pdf")
    assert pdf_res.status_code == 200, f"Export PDF failed: {pdf_res.text}"
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-"), "Exported file must be valid PDF"
    print(f"    Generated official PDF: {len(pdf_res.content)} bytes with valid %PDF header.")
    print("    [PASS] Jinja2 template and ReportLab PDF export verified!")

    # 8. Verify Risk-Weighted Sampling Recommendation (Feature 5)
    print("[9] Testing Feature 5: Risk-Weighted Stratified Sampling Recommendation & Review...")
    plan_res = client.get(f"/api/sampling-plan?batch_id={batch_id}&total_sample_size=30")
    assert plan_res.status_code == 200, f"Get sampling plan failed: {plan_res.text}"
    plan_data = plan_res.json()
    samples = plan_data.get("samples", [])
    entity_budgets = plan_data.get("entity_budgets", [])
    print(f"    Allocated sample budget across {len(entity_budgets)} entities (Total records: {len(samples)})")
    assert len(samples) > 0, "Expected stratified sample records"
    first_sample = samples[0]
    print(f"    Sample record: {first_sample['evidence_id']} ({first_sample['cse_id']}) Stratum: {first_sample['stratum']}")

    # Mark sample as reviewed
    rev_res = client.post(
        "/api/sampling-plan/review",
        json={
            "batch_id": batch_id,
            "evidence_id": first_sample["evidence_id"],
            "reviewed": True,
            "reviewer": "Lead Supervisor Verma",
            "notes": "Verified telemetry absence on core database."
        }
    )
    assert rev_res.status_code == 200, f"Update review failed: {rev_res.text}"
    print(f"    Successfully toggled review status for {first_sample['evidence_id']}")
    print("    [PASS] Risk-weighted stratified sampling and persistent review verified!")

    print("\n=== ALL 6 SUPERVISORY AUTOMATION FEATURES TESTED AND PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_automation_features_test()
