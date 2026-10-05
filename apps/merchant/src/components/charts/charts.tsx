'use client';

import { useMemo } from 'react';
import { useI18n } from '@/i18n/provider';
import { formatNumber } from '@/lib/format';

export interface LinePoint { label: string; value: number }

/**
 * Dependency-free SVG line/area chart. Keeps the bundle small and renders
 * consistently in both LTR and RTL (the axis is drawn start-to-end, not by
 * CSS direction, so numbers always read correctly).
 */
export function LineChart({ data, color = '#f97316', height = 200, valueFormatter }: {
  data: LinePoint[]; color?: string; height?: number; valueFormatter?: (v: number) => string;
}) {
  const { locale } = useI18n();
  const width = 600;
  const pad = { top: 16, right: 16, bottom: 28, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const { path, area, max, points } = useMemo(() => {
    const maxV = Math.max(1, ...data.map((d) => d.value));
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
    const pts = data.map((d, i) => ({
      x: pad.left + i * stepX,
      y: pad.top + innerH - (d.value / maxV) * innerH,
      ...d,
    }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const ar = pts.length
      ? `${line} L${pts[pts.length - 1].x.toFixed(1)},${pad.top + innerH} L${pts[0].x.toFixed(1)},${pad.top + innerH} Z`
      : '';
    return { path: line, area: ar, max: maxV, points: pts };
  }, [data, innerH, innerW, pad.left, pad.top]);

  if (!data.length) {
    return <div className="py-12 text-center text-sm text-slate-400">—</div>;
  }

  const fmt = valueFormatter ?? ((v: number) => formatNumber(v, locale));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="chart">
      {[0, 0.5, 1].map((r) => (
        <line
          key={r}
          x1={pad.left}
          x2={width - pad.right}
          y1={pad.top + innerH * r}
          y2={pad.top + innerH * r}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      ))}
      {[0, 0.5, 1].map((r) => (
        <text key={r} x={pad.left - 6} y={pad.top + innerH * r + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
          {fmt(Math.round(max * (1 - r)))}
        </text>
      ))}
      <path d={area} fill={color} opacity="0.12" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
      ))}
      {points.length > 0 && (
        <text x={pad.left} y={height - 8} fontSize="10" fill="#94a3b8" textAnchor="start">
          {points[0].label}
        </text>
      )}
      {points.length > 1 && (
        <text x={width - pad.right} y={height - 8} fontSize="10" fill="#94a3b8" textAnchor="end">
          {points[points.length - 1].label}
        </text>
      )}
    </svg>
  );
}

/** Horizontal bar chart for categorical breakdowns (e.g. orders by status). */
export function BarChart({ data, color = '#2563eb', valueFormatter }: {
  data: LinePoint[]; color?: string; valueFormatter?: (v: number) => string;
}) {
  const { locale } = useI18n();
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = valueFormatter ?? ((v: number) => formatNumber(v, locale));

  if (!data.length) return <div className="py-12 text-center text-sm text-slate-400">—</div>;

  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-2 text-xs">
          <span className="w-28 shrink-0 truncate text-slate-500" title={d.label}>{d.label}</span>
          <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color }}
            />
          </span>
          <span className="w-12 shrink-0 text-end tabular-nums text-slate-700">{fmt(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}
