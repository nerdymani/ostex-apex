import React, { useState } from 'react';

export default function AIAnalysis({ analysis }) {
  const [lang, setLang] = useState('en');

  if (!analysis) {
    return (
      <div
        className="py-10 text-center"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderLeft: '3px solid var(--border-bright)' }}
      >
        <span className="data" style={{ color: 'var(--text-secondary)' }}>No AI analysis available. Configure Claude API key in Settings.</span>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderLeft: '3px solid var(--brand)' }}>
      {/* Lang tabs */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        {[['en', 'English'], ['sw', 'Kiswahili']].map(([l, label]) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="px-5 py-3 text-[10px] font-black tracking-[0.12em] uppercase transition-colors"
            style={{
              fontFamily: 'var(--font-display)',
              background: lang === l ? 'var(--brand-dim)' : 'transparent',
              color: lang === l ? 'var(--brand)' : 'var(--text-secondary)',
              borderBottom: lang === l ? '2px solid var(--brand)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {/* Summary */}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
          {lang === 'en'
            ? (analysis.executive_summary_english || 'No English summary available.')
            : (analysis.executive_summary_swahili || 'Hakuna muhtasari wa Kiswahili.')}
        </p>

        {/* Business impact */}
        {analysis.business_impact && (
          <div className="p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderLeft: '2px solid var(--warning)' }}>
            <div className="label mb-2" style={{ color: 'var(--warning)' }}>Business Impact</div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{analysis.business_impact}</p>
          </div>
        )}

        {/* Regulatory note */}
        {analysis.tanzanian_regulatory_note && (
          <div className="p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderLeft: '2px solid var(--info)' }}>
            <div className="label mb-2" style={{ color: 'var(--info)' }}>Regulatory Note — TCRA / Data Protection</div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{analysis.tanzanian_regulatory_note}</p>
          </div>
        )}

        {/* Top 5 actions */}
        {analysis.top_5_actions?.length > 0 && (
          <div>
            <div className="label mb-3" style={{ color: 'var(--text-secondary)' }}>Top Recommended Actions</div>
            <ol className="space-y-2">
              {analysis.top_5_actions.map((action, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-black text-white"
                    style={{ background: 'var(--brand)', fontFamily: 'var(--font-display)' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{action}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
