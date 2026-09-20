from sqlalchemy import Boolean, Column, Integer, String, Float, DateTime, Text
from ..db import Base

class BatchRecord(Base):
    __tablename__ = 'batches'
    id = Column(String, primary_key=True)
    created_at = Column(DateTime)
    cse_ids = Column(String)
    status = Column(String)

class AlertRecord(Base):
    __tablename__ = 'alerts'
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String)
    alert_id = Column(String)
    cse_id = Column(String)
    severity = Column(String)
    created_at = Column(DateTime)
    acknowledged_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    status = Column(String)
    case_id = Column(String, nullable=True)
    asset_id = Column(String, nullable=True)
    escalated = Column(Boolean, nullable=True)
    closure_minutes = Column(Float, nullable=True)

class CaseRecord(Base):
    __tablename__ = 'cases'
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String)
    case_id = Column(String)
    cse_id = Column(String)
    opened_at = Column(DateTime)
    closed_at = Column(DateTime, nullable=True)
    investigation_text = Column(Text, nullable=True)
    investigator_id = Column(String, nullable=True)
    escalated = Column(Boolean, nullable=True)
    resolution = Column(String, nullable=True)
    alert_ids = Column(String, nullable=True)

class AssetRecord(Base):
    __tablename__ = 'assets'
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String)
    asset_id = Column(String)
    cse_id = Column(String)
    classification = Column(String)
    asset_type = Column(String, nullable=True)
    sector = Column(String, nullable=True)

class CSEFeatures(Base):
    __tablename__ = 'cse_features'
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String)
    cse_id = Column(String)
    features_json = Column(Text)
    sector = Column(String, nullable=True)
    alert_count = Column(Integer)
    case_count = Column(Integer)

class RiskScore(Base):
    __tablename__ = 'risk_scores'
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String)
    cse_id = Column(String)
    risk_score = Column(Float)
    risk_level = Column(String)
    score_breakdown_json = Column(Text)
    shap_values_json = Column(Text)
    is_grey = Column(Boolean)
    primary_reason = Column(String, nullable=True)
    flag_count = Column(Integer)
    analysed_at = Column(DateTime)

class FlagRecord(Base):
    __tablename__ = 'flags'
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String)
    cse_id = Column(String)
    rule_id = Column(String)
    rule_name = Column(String)
    description = Column(Text)
    severity = Column(String)
    flag_type = Column(String)
    evidence_ids_json = Column(Text)
    status = Column(String, default="OPEN", nullable=True)
    auto_triaged_by = Column(String, nullable=True)

class NegativeSpaceFinding(Base):
    __tablename__ = 'negative_space_findings'
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String)
    cse_id = Column(String)
    finding_type = Column(String)
    asset_id = Column(String, nullable=True)
    description = Column(Text)
    expected_value = Column(String)
    observed_value = Column(String)
    severity = Column(String)
    peer_context_json = Column(Text)
    status = Column(String, default="OPEN", nullable=True)
    auto_triaged_by = Column(String, nullable=True)

class SupervisorNote(Base):
    __tablename__ = 'supervisor_notes'
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String)
    cse_id = Column(String)
    note = Column(Text)
    created_at = Column(DateTime)

class FindingReviewRecord(Base):
    __tablename__ = 'finding_reviews'
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String)
    finding_id = Column(String)  # e.g. "FLAG-{id}" or "NS-{id}"
    status = Column(String, default="NEW")  # NEW, UNDER_REVIEW, ACKNOWLEDGED, RESOLVED
    reviewer = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime)

class SystemicPattern(Base):
    __tablename__ = 'systemic_patterns'
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String)
    pattern_key = Column(String)          # the rule_id or negative-space finding_type shared across entities
    pattern_label = Column(String)        # human-readable name, e.g. "Template-Driven Investigation Text"
    entity_count = Column(Integer)
    total_entities_in_batch = Column(Integer)
    affected_entities_json = Column(Text) # ["CSE-01","CSE-07",...]
    sectors_json = Column(Text)           # distinct sectors among affected entities
    severity = Column(String)             # escalated one level above individual finding's severity
    description = Column(Text)
    created_at = Column(DateTime)

class EntityCycleComparison(Base):
    __tablename__ = 'entity_cycle_comparisons'
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String)
    cse_id = Column(String)
    previous_batch_id = Column(String, nullable=True)
    risk_score_delta = Column(Float, nullable=True)
    new_findings_json = Column(Text)        # rule_ids/finding_types present now but not last cycle
    resolved_findings_json = Column(Text)   # present last cycle, absent now
    recurring_findings_json = Column(Text)  # present in both
    chronic_findings_json = Column(Text)    # rule_ids present 3+ consecutive cycles, with count

class AdvisoryDraft(Base):
    __tablename__ = 'advisory_drafts'
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String)
    cse_id = Column(String)
    finding_ids_json = Column(Text)
    subject = Column(String)
    body_text = Column(Text)
    status = Column(String, default='DRAFT')  # DRAFT | APPROVED
    generated_at = Column(DateTime)
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)

class TriagePolicy(Base):
    __tablename__ = 'triage_policies'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String)
    match_rule_id = Column(String, nullable=True)       # e.g. "R-04", or null = any
    match_finding_type = Column(String, nullable=True)  # for negative-space, or null
    match_severity = Column(String, nullable=True)      # or null = any
    match_sector = Column(String, nullable=True)        # or null = any
    action = Column(String)                             # AUTO_FALSE_POSITIVE | AUTO_ACKNOWLEDGE | AUTO_ESCALATE
    active = Column(Boolean, default=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime)

class SampleReviewRecord(Base):
    __tablename__ = 'sample_reviews'
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String)
    record_id = Column(String)
    reviewed = Column(Boolean, default=True)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)


