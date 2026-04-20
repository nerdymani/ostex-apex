import React, { useState } from 'react';

export default function BreachCard({ breach }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-dim)',
        borderLeft: '3px solid var(--danger)',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer transition-colors"
        style={{ background: expanded ? 'var(--bg-elevated)' : 'transparent' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
            style={{ background: 'var(--danger)' }}
          />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
              {breach.name}
            </p>
            <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
              {breach.breach_date || 'Unknown date'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {breach.pwn_count > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-bold font-mono" style={{ color: 'var(--text)' }}>
                {breach.pwn_count.toLocaleString()}
              </span>{' '}accounts
            </span>
          )}
          <svg
            width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            strokeWidth="2"
            style={{
              color: 'var(--text-secondary)',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div
          className="px-5 pb-4 pt-4"
          style={{ borderTop: '1px solid var(--border-dim)' }}
        >
          {breach.description && (
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
              {breach.description}
            </p>
          )}
          {breach.compromised_data?.length > 0 && (
            <div>
              <div className="label mb-2">Compromised Data Types</div>
              <div className="flex flex-wrap gap-1.5">
                {breach.compromised_data.map((d, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs font-mono"
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: 'var(--danger)',
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
