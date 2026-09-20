export default function ScoreBar({ breakdown, totalScore = null }) {
  if (!breakdown) return null;
  
  const { rules = 0, statistical = 0, peer = 0, negative_space = 0, points = {} } = breakdown;
  const total = rules + statistical + peer + negative_space || 1;
  
  const rulesPct = (rules / total) * 100;
  const statPct = (statistical / total) * 100;
  const peerPct = (peer / total) * 100;
  const nsPct = (negative_space / total) * 100;

  const pointsList = [
    { label: 'Execution Gaps', points: points.execution_gap ?? Math.round(rules * 0.3), color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    { label: 'Negative Space', points: points.negative_space ?? Math.round(negative_space * 0.2), color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
    { label: 'Peer Deviation', points: points.peer_deviation ?? Math.round(peer * 0.25), color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    { label: 'Statistical Outliers', points: points.statistical_deviation ?? Math.round(statistical * 0.25), color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  ].filter(item => item.points > 0);
  
  return (
    <div className="w-full space-y-3">
      {/* Proportion Bar */}
      <div className="h-3 w-full bg-slate-100 rounded-sm overflow-hidden flex border border-slate-200">
        {rulesPct > 0 && <div style={{ width: `${rulesPct}%` }} className="bg-red-500 h-full transition-all" title={`Execution Gaps: ${rules}`} />}
        {statPct > 0 && <div style={{ width: `${statPct}%` }} className="bg-blue-500 h-full transition-all" title={`Statistical: ${statistical}`} />}
        {peerPct > 0 && <div style={{ width: `${peerPct}%` }} className="bg-amber-500 h-full transition-all" title={`Peer Deviation: ${peer}`} />}
        {nsPct > 0 && <div style={{ width: `${nsPct}%` }} className="bg-purple-600 h-full transition-all" title={`Negative Space: ${negative_space}`} />}
      </div>

      {/* Point Additions Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {pointsList.map((item, idx) => (
          <div key={idx} className={`px-2.5 py-1.5 rounded border text-xs flex items-center justify-between ${item.bg}`}>
            <span className="font-medium text-slate-700 flex items-center gap-1.5 truncate">
              <span className={`w-2 h-2 rounded-full ${item.color} shrink-0`}></span>
              {item.label}
            </span>
            <span className={`font-mono font-bold ml-1 ${item.text}`}>
              +{Number(item.points).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

