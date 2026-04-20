import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const OS_TABS = ['Ubuntu/Debian', 'CentOS/RHEL', 'Windows Server'];

function CodeBlock({ code }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="relative group overflow-hidden"
      style={{ background: 'var(--bg)', border: '1px solid var(--border-dim)', borderLeft: '3px solid var(--border)' }}
    >
      <pre className="px-4 py-3 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all"
        style={{ color: 'var(--brand)' }}>
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 px-2 py-1 text-xs font-black tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          fontFamily: 'var(--font-display)',
          background: copied ? 'var(--brand)' : 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: copied ? 'white' : 'var(--text-secondary)',
        }}
      >
        {copied ? t('remediation.copied') : t('remediation.copy')}
      </button>
    </div>
  );
}

function ConfigDiff({ change }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{change.description}</p>
      <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{change.file}</p>
      <div className="overflow-hidden text-xs font-mono" style={{ border: '1px solid var(--border-dim)' }}>
        {change.before && change.before.split('\n').map((line, i) => (
          <div key={`b${i}`} className="px-3 py-0.5 flex gap-2" style={{ background: 'rgba(239,68,68,0.08)' }}>
            <span style={{ color: '#ef4444', userSelect: 'none' }}>−</span>
            <span style={{ color: '#ef4444' }}>{line}</span>
          </div>
        ))}
        {change.after && change.after.split('\n').map((line, i) => (
          <div key={`a${i}`} className="px-3 py-0.5 flex gap-2" style={{ background: 'rgba(16,185,129,0.08)' }}>
            <span style={{ color: '#10b981', userSelect: 'none' }}>+</span>
            <span style={{ color: '#10b981' }}>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const fixCache = {};

const SEV_STYLES = {
  Critical: { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
  High:     { background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' },
  Medium:   { background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
  Low:      { background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' },
};

export default function RemediationModal({ cve, onClose }) {
  const { t } = useTranslation();
  const [fix, setFix] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeOS, setActiveOS] = useState(OS_TABS[0]);
  const [activeTab, setActiveTab] = useState('commands');

  const fetchFix = useCallback(async () => {
    const cacheKey = cve.cve_id;
    if (fixCache[cacheKey]) {
      setFix(fixCache[cacheKey]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cve_id: cve.cve_id,
          cve_description: cve.description,
          affected_software: cve.software,
          severity: cve.severity,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || t('remediation.error'));
        return;
      }
      const data = await res.json();
      fixCache[cacheKey] = data.remediation;
      setFix(data.remediation);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cve, t]);

  useEffect(() => { fetchFix(); }, [fetchFix]);

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const commandsForOS = fix?.commands?.filter(c => c.os === activeOS) || [];
  const tabs = ['commands', 'config', 'verification'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--brand)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-4 flex-shrink-0"
          style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-dim)' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold" style={{ color: 'var(--brand)' }}>
                {cve.cve_id}
              </span>
              <span
                className="px-2 py-0.5 text-[9px] font-black tracking-wider uppercase"
                style={{ fontFamily: 'var(--font-display)', ...(SEV_STYLES[cve.severity] || {}) }}
              >
                {cve.severity}
              </span>
              {cve.software && (
                <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{cve.software}</span>
              )}
            </div>
            <p
              className="text-sm font-black tracking-wider uppercase"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
            >
              {t('remediation.title')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="transition-colors mt-0.5"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div
                className="w-7 h-7 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin"
              />
              <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                {t('remediation.loading')}
              </p>
            </div>
          )}

          {error && (
            <div
              className="px-4 py-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }}
            >
              {error}
            </div>
          )}

          {fix && !loading && (
            <div className="space-y-5">
              {/* Immediate action */}
              <div
                className="px-4 py-3"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b' }}
              >
                <div className="label mb-1.5" style={{ color: '#f59e0b' }}>
                  {t('remediation.immediate')}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#fde68a' }}>{fix.immediate_action}</p>
              </div>

              {/* Meta badges */}
              <div className="flex flex-wrap gap-2">
                {fix.estimated_time && (
                  <span
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', color: 'var(--text-secondary)' }}
                  >
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" />
                    </svg>
                    {t('remediation.estimated_time')}: {fix.estimated_time}
                  </span>
                )}
                <span
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono"
                  style={fix.requires_restart
                    ? { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }
                    : { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }
                  }
                >
                  {fix.requires_restart
                    ? '⚡ ' + t('remediation.requires_restart')
                    : '✓ ' + t('remediation.no_restart')}
                </span>
              </div>

              {/* Tabs */}
              <div className="flex" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                {tabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="px-4 py-2.5 text-[10px] font-black tracking-wider uppercase transition-colors"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: activeTab === tab ? 'var(--brand)' : 'var(--text-secondary)',
                      borderBottom: activeTab === tab ? '2px solid var(--brand)' : '2px solid transparent',
                      marginBottom: '-1px',
                      background: 'transparent',
                    }}
                  >
                    {t(`remediation.${tab === 'verification' ? 'verification' : tab === 'config' ? 'config_changes' : 'commands'}`)}
                  </button>
                ))}
              </div>

              {/* Commands tab */}
              {activeTab === 'commands' && (
                <div>
                  <div className="flex gap-1 mb-3">
                    {OS_TABS.map(os => (
                      <button
                        key={os}
                        onClick={() => setActiveOS(os)}
                        className="px-3 py-1 text-xs font-medium transition-colors"
                        style={{
                          background: activeOS === os ? 'var(--bg-elevated)' : 'transparent',
                          border: activeOS === os ? '1px solid var(--border)' : '1px solid transparent',
                          color: activeOS === os ? 'var(--text)' : 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {os}
                      </button>
                    ))}
                  </div>
                  {commandsForOS.length > 0 ? (
                    <div className="space-y-3">
                      {commandsForOS.map((cmd, i) => (
                        <div key={i}>
                          {cmd.description && (
                            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{cmd.description}</p>
                          )}
                          <CodeBlock code={cmd.command} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {t('remediation.no_commands')}
                    </p>
                  )}
                </div>
              )}

              {/* Config tab */}
              {activeTab === 'config' && (
                <div>
                  {fix.config_changes?.length > 0 ? (
                    <div className="space-y-4">
                      {fix.config_changes.map((change, i) => (
                        <ConfigDiff key={i} change={change} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {t('remediation.no_config')}
                    </p>
                  )}
                </div>
              )}

              {/* Verification tab */}
              {activeTab === 'verification' && (
                <div className="space-y-3">
                  {fix.verification && <CodeBlock code={fix.verification} />}
                </div>
              )}

              {/* References */}
              {fix.references?.length > 0 && (
                <div>
                  <div className="label mb-2">{t('remediation.references')}</div>
                  <ul className="space-y-1">
                    {fix.references.map((ref, i) => (
                      <li key={i}>
                        <a
                          href={ref.url} target="_blank" rel="noreferrer"
                          className="text-xs font-mono transition-colors"
                          style={{ color: 'var(--brand)' }}
                          onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.target.style.textDecoration = 'none'}
                        >
                          {ref.title || ref.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
