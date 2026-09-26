/**
 * ScoreRing — compact circular progress indicator.
 * Restrained: no glow, no gradients, no animation loops.
 * Used for the SOC effectiveness / coverage indicators on the Overview page.
 */
const RING_TONES = {
  brand:  { stroke: '#3E7D6B', track: '#DDEBE5' },
  blue:   { stroke: '#557C91', track: '#DCE7ED' },
  green:  { stroke: '#4D8A68', track: '#DDEDE3' },
  amber:  { stroke: '#B88A43', track: '#F2E7D3' },
  red:    { stroke: '#B65D5D', track: '#F3DFDF' },
};

function toneForValue(value) {
  if (value >= 80) return 'green';
  if (value >= 60) return 'brand';
  if (value >= 40) return 'amber';
  return 'red';
}

export default function ScoreRing({
  value = 0,
  size = 92,
  strokeWidth = 7,
  label = '',
  sub = '',
  tone = null,
  suffix = '%',
}) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const resolvedTone = tone || toneForValue(v);
  const palette = RING_TONES[resolvedTone] || RING_TONES.brand;

  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const center = size / 2;
  const valueFont = size >= 110 ? 28 : Math.max(18, Math.round(size * 0.21));
  const labelFont = size >= 110 ? 11 : 10;

  return (
    <div className="inline-flex flex-col items-center gap-1.5" style={{ width: size + 18 }}>
      <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${label} ${Math.round(v)}%`}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
          {/* Track */}
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={palette.track}
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={palette.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-semibold tracking-tight leading-none tabular-nums"
            style={{ fontSize: valueFont, color: '#203732' }}
          >
            {Math.round(v)}
            <span style={{ fontSize: Math.max(10, Math.round(valueFont * 0.55)), color: '#63766F' }}>{suffix}</span>
          </span>
        </div>
      </div>
      {label && (
        <span
          className="font-semibold uppercase tracking-wide leading-none text-center"
          style={{ fontSize: labelFont, color: '#63766F' }}
        >
          {label}
        </span>
      )}
      {sub && (
        <span className="font-mono leading-none text-center" style={{ fontSize: 9.5, color: '#93A7A0' }}>
          {sub}
        </span>
      )}
    </div>
  );
}