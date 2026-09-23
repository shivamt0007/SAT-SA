export default function MetricCard({ title, value, subtitle, icon: Icon, color = 'slate' }) {
  const accentColors = {
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
    red: 'text-red-700 bg-red-50 border-red-200',
    orange: 'text-orange-700 bg-orange-50 border-orange-200',
    green: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    yellow: 'text-amber-700 bg-amber-50 border-amber-200',
    purple: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    slate: 'text-slate-700 bg-slate-50 border-slate-200'
  };

  const textColors = {
    blue: 'text-blue-900',
    red: 'text-red-700',
    orange: 'text-orange-700',
    green: 'text-emerald-700',
    amber: 'text-amber-700',
    yellow: 'text-amber-700',
    purple: 'text-indigo-900',
    slate: 'text-slate-900'
  };

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-1.5 rounded border ${accentColors[color] || accentColors.slate}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold font-mono tracking-tight ${textColors[color] || 'text-slate-900'}`}>
        {value}
      </div>
      {subtitle && <p className="text-[11px] text-slate-500 mt-1 leading-tight">{subtitle}</p>}
    </div>
  );
}


