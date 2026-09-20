export default function RiskBadge({ level = 'UNASSESSED' }) {
  const normLevel = (level || 'UNASSESSED').toUpperCase();
  const classes = {
    CRITICAL: 'risk-badge-critical',
    HIGH: 'risk-badge-high',
    MEDIUM: 'risk-badge-medium',
    LOW: 'risk-badge-low',
    UNASSESSED: 'risk-badge-unassessed',
    INFO: 'risk-badge-info',
    INFORMATIONAL: 'risk-badge-info',
  };
  return <span className={classes[normLevel] || classes.UNASSESSED}>{normLevel}</span>;
}
