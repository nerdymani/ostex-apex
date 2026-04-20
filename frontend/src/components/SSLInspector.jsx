import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RiskGauge from './RiskGauge';

const STATUS_STYLES = {
  pass:    { bg: 'rgba(16,185,129,0.1)',  text: '#10b981', border: 'rgba(16,185,129,0.3)' },
  warning: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  fail:    { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  info:    { bg: 'var(--bg-elevated)',    text: 'var(--text-secondary)', border: 'var(--border)' },
};

const STATUS_ICON = {
  pass: (
    <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="7" fill="#10b981" />
      <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  warning: (
    <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
      <path d="M8 2L14.5 13H1.5L8 2Z" fill="#f59e0b" />
      <path d="M8 6v3M8 10.5v.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  fail: (
    <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="7" fill="#ef4444" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="7" stroke="var(--border-bright)" strokeWidth="1.5" />
      <path d="M8 7v4M8 5.5v.5" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

function FindingRow({ finding }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const sty = STATUS_STYLES[finding.status] || STATUS_STYLES.info;
  const icon = STATUS_ICON[finding.status] || STATUS_ICON.info;
  const label = t(`ssl.status.${finding.status}`, finding.status);

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ background: 'transparent' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex-shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
          {finding.check_name}
        </span>
        <span
          className="px-2 py-0.5 text-[9px] font-black tracking-wider uppercase"
          style={{ fontFamily: 'var(--font-display)', background: sty.bg, color: sty.text, border: `1px solid ${sty.border}` }}
        >
          {label}
        </span>
        {finding.severity !== 'Info' && finding.status !== 'pass' && (
          <span
            className="px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase"
            style={{ fontFamily: 'var(--font-display)', background: sty.bg, color: sty.text, border: `1px solid ${sty.border}` }}
          >
            {finding.severity}
          </span>
        )}
        <svg
          width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
          style={{
            color: 'var(--text-secondary)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-2" style={{ borderTop: '1px solid var(--border-dim)' }}>
          <p className="text-xs leading-relaxed font-mono" style={{ color: 'var(--text-secondary)' }}>
            {finding.detail}
          </p>
        </div>
      )}
    </div>
  );
}

export default function SSLInspector({ defaultDomain = '' }) {
  const { t } = useTranslation();
  const [domain, setDomain] = useState(defaultDomain);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function inspect() {
    if (!domain.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await fetch('/api/scan/ssl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const data = await r.json();
      if (data.error && !data.reachable) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const cert = result?.certificate || {};
  const tls = result?.tls_versions || {};

  const passFails = result?.findings
    ? {
        pass: result.findings.filter(f => f.status === 'pass').length,
        warning: result.findings.filter(f => f.status === 'warning').length,
        fail: result.findings.filter(f => f.status === 'fail').length,
      }
    : null;

  const sslLevel =
    !result ? 'Unknown' :
    result.ssl_score >= 80 ? 'Low' :
    result.ssl_score >= 60 ? 'Medium' :
    result.ssl_score >= 40 ? 'High' : 'Critical';

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
      {/* Header + input */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-elevated)' }}>
        <div
          className="text-sm font-black tracking-wider uppercase mb-3"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--brand)' }}
        >
          {t('ssl.title')}
        </div>
        {defaultDomain && (
          <p className="text-xs mb-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
            {t('ssl.pre_fill')}: <span style={{ color: 'var(--brand)' }}>{defaultDomain}</span>
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && inspect()}
            placeholder={t('ssl.input_placeholder')}
            className="flex-1 px-3 py-2 text-sm font-mono focus:outline-none transition-colors"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--brand)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={inspect}
            disabled={loading || !domain.trim()}
            className="px-4 py-2 text-xs font-black tracking-wider uppercase transition-all disabled:opacity-40"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'var(--brand)',
              color: 'white',
              border: 'none',
            }}
          >
            {loading ? t('ssl.inspecting') : t('ssl.inspect_btn')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="px-5 py-4 text-sm"
          style={{ background: 'rgba(239,68,68,0.05)', borderBottom: '1px solid var(--border-dim)', color: 'var(--danger)' }}
        >
          {t('ssl.error_unreachable')}<br />
          <span className="font-mono text-xs" style={{ opacity: 0.6 }}>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="px-5 py-8 text-center">
          <div
            className="inline-block w-5 h-5 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin mb-2"
          />
          <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{t('ssl.inspecting')}</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="p-5 space-y-5">
          {/* Score + cert summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              className="flex flex-col items-center justify-center p-4"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)' }}
            >
              <div className="label mb-2">{t('ssl.ssl_score')}</div>
              <RiskGauge score={result.ssl_score} level={sslLevel} />
            </div>

            <div
              className="sm:col-span-2 p-4 space-y-2"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)' }}
            >
              <div className="label mb-3">{t('ssl.certificate')}</div>
              {cert.issuer && (
                <div className="flex gap-2 text-sm">
                  <span className="font-mono text-xs w-16 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    {t('ssl.issuer')}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text)' }}>{cert.issuer}</span>
                </div>
              )}
              {cert.valid_until && (
                <div className="flex gap-2 text-sm">
                  <span className="font-mono text-xs w-16 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    {t('ssl.expires')}
                  </span>
                  <span
                    className="text-sm font-mono"
                    style={{ color: cert.days_remaining < 30 ? '#f59e0b' : 'var(--text)' }}
                  >
                    {cert.valid_until}
                    {cert.days_remaining !== undefined && (
                      <span className="text-xs ml-1.5" style={{ color: 'var(--text-secondary)' }}>
                        ({cert.days_remaining} {t('ssl.days_remaining')})
                      </span>
                    )}
                  </span>
                </div>
              )}
              {cert.sans?.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="font-mono text-xs w-16 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    {t('ssl.covers')}
                  </span>
                  <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {cert.sans.slice(0, 4).join(', ')}
                  </span>
                </div>
              )}

              {/* TLS version badges */}
              {Object.keys(tls).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {Object.entries(tls).map(([ver, supported]) => (
                    <span
                      key={ver}
                      className="px-2 py-0.5 text-xs font-mono font-bold"
                      style={supported
                        ? (ver === 'TLS 1.3'
                            ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                            : ver === 'TLS 1.2'
                            ? { background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }
                            : { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' })
                        : { background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border-dim)' }
                      }
                    >
                      {supported ? '✓' : '✗'} {ver}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pass/fail summary */}
          {passFails && (
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#10b981' }}>
                {STATUS_ICON.pass} {passFails.pass} {t('common.pass')}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#f59e0b' }}>
                {STATUS_ICON.warning} {passFails.warning} {t('common.warning')}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#ef4444' }}>
                {STATUS_ICON.fail} {passFails.fail} {t('common.fail')}
              </span>
            </div>
          )}

          {/* Findings list */}
          <div className="space-y-1.5">
            <div className="label mb-3">{t('ssl.findings')}</div>
            {result.findings.map((f, i) => (
              <FindingRow key={i} finding={f} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
