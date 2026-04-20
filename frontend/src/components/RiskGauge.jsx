import React from 'react';

export default function RiskGauge({ score, level }) {
  const clampedScore = Math.max(0, Math.min(100, score || 0));

  const color =
    clampedScore >= 70 ? '#ef4444' :
    clampedScore >= 40 ? '#f59e0b' : '#10b981';

  const levelStyle =
    clampedScore >= 70
      ? { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }
      : clampedScore >= 40
      ? { background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }
      : { background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' };

  const R = 70;
  const cx = 90;
  const cy = 90;
  const startAngle = 135;
  const endAngle = 45;

  function polar(angle) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  }

  const bgStart = polar(startAngle);
  const bgEnd = polar(endAngle);
  const sweepDeg = 270;
  const fillDeg = (clampedScore / 100) * sweepDeg;
  const fillAngle = startAngle + fillDeg;
  const fillEnd = polar(fillAngle);

  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 1 1 ${bgEnd.x} ${bgEnd.y}`;
  const fillLargeArc = fillDeg > 180 ? 1 : 0;
  const fillPath =
    fillDeg > 0
      ? `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 ${fillLargeArc} 1 ${fillEnd.x} ${fillEnd.y}`
      : '';

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="160" viewBox="0 0 180 160">
        <path d={bgPath} fill="none" stroke="var(--border)" strokeWidth="14" strokeLinecap="round" />
        {fillPath && (
          <path
            d={fillPath} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
          />
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text)"
          style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          {clampedScore}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill="var(--text-secondary)"
          style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          / 100
        </text>
      </svg>
      <span
        className="mt-1 px-3 py-1 text-xs font-black tracking-widest uppercase"
        style={{ fontFamily: 'var(--font-display)', ...levelStyle }}
      >
        {level || 'Unknown'}
      </span>
    </div>
  );
}
