import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const ICON_TONES = {
  blue: 'text-blue-700 bg-blue-50 border-blue-200',
  red: 'text-red-600 bg-red-50 border-red-200',
  orange: 'text-orange-700 bg-orange-50 border-orange-200',
  green: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  amber: 'text-amber-700 bg-amber-50 border-amber-200',
  yellow: 'text-amber-700 bg-amber-50 border-amber-200',
  purple: 'text-purple-700 bg-purple-50 border-purple-200',
  rose: 'text-rose-600 bg-rose-50 border-rose-200',
  brand: 'text-brand-700 bg-brand-50 border-brand-200',
  slate: 'text-slate-600 bg-slate-100 border-slate-200',
};

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'slate',
  trend = null,
  footer = null,
}) {
  const tone = ICON_TONES[color] || ICON_TONES.slate;

  const trendChip = (() => {
    if (!trend) return null;
    const dir = trend.dir || 'flat';
    const IconChip = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus;
    const cls = dir === 'good'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : dir === 'bad'
        ? 'text-red-600 bg-red-50 border-red-200'
        : 'text-slate-500 bg-slate-100 border-slate-200';

    return (
      <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
        <IconChip className="w-3 h-3" aria-hidden="true" />
        {trend.delta}
      </span>
    );
  })();

  return (
    <div className="group h-full bg-paper border border-line rounded-[12px] p-4 shadow-card transition-all duration-200 ease-out hover:border-brand-300 hover:shadow-card-hover">
      <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[18px]">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">{title}</span>
        {Icon && (
          <div className={`p-1 rounded-lg border ${tone}`} title={title}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-[26px] leading-none font-semibold tracking-tight text-ink tabular-nums">
          {value}
        </span>
        {trendChip}
      </div>
      {subtitle && (
        <p className="text-[11px] text-faint mt-1.5 leading-tight truncate" title={subtitle}>
          {subtitle}
        </p>
      )}
      {footer && (
        <div className="flex items-center gap-1 text-[10.5px] text-faint mt-1 leading-none">{footer}</div>
      )}
    </div>
  );
}

