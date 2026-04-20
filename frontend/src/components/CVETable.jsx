import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RemediationModal from './RemediationModal';

const SEV_COLORS = {
  Critical: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  High:     { bg: 'rgba(249,115,22,0.12)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
  Medium:   { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  Low:      { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  Unknown:  { bg: 'var(--bg-elevated)', text: 'var(--text-secondary)', border: 'var(--border)' },
};

export default function CVETable({ cves = [] }) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState('cvss_score');
  const [sortDir, setSortDir] = useState('desc');
  const [filter, setFilter] = useState('All');
  const [fixCve, setFixCve] = useState(null);

  const severities = ['All', 'Critical', 'High', 'Medium', 'Low'];

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const filtered = cves.filter(c => filter === 'All' || c.severity === filter);
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] ?? ''; const bv = b[sortKey] ?? '';
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (!cves.length) {
    return (
      <div
        className="py-12 text-center"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderLeft: '3px solid var(--border-bright)' }}
      >
        <span className="data" style={{ color: 'var(--text-secondary)' }}>{t('cve.no_cves')}</span>
      </div>
    );
  }

  const cols = [
    ['cve_id', 'CVE ID'],
    ['software', 'Software'],
    ['cvss_score', 'CVSS'],
    ['severity', 'Severity'],
    ['attack_vector', 'Vector'],
    ['published_date', 'Published'],
    ['patch_available', 'Patch'],
  ];

  return (
    <div>
      {/* Filter row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {severities.map(s => {
          const count = s === 'All' ? cves.length : cves.filter(c => c.severity === s).length;
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-1 text-[10px] font-black tracking-[0.1em] uppercase transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                background: active ? 'var(--brand-dim)' : 'var(--bg-surface)',
                border: active ? '1px solid var(--brand)' : '1px solid var(--border-dim)',
                color: active ? 'var(--brand)' : 'var(--text-secondary)',
              }}
            >
              {s} <span style={{ opacity: 0.5, marginLeft: '4px' }}>{count}</span>
            </button>
          );
        })}
        <span className="ml-auto data" style={{ color: 'var(--text-secondary)' }}>
          {sorted.length} / {cves.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ border: '1px solid var(--border-dim)' }}>
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
              {cols.map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-4 py-3 text-left cursor-pointer select-none transition-colors"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '9px',
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: sortKey === key ? 'var(--brand)' : 'var(--text-secondary)',
                    borderRight: '1px solid var(--border-dim)',
                  }}
                >
                  {label}
                  <span className="ml-1" style={{ opacity: 0.5 }}>
                    {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </th>
              ))}
              <th
                className="px-4 py-3 text-left"
                style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}
              >
                Fix
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((cve, i) => {
              const sev = SEV_COLORS[cve.severity] || SEV_COLORS.Unknown;
              return (
                <tr
                  key={cve.cve_id + i}
                  style={{
                    background: cve.actively_exploited ? 'rgba(239,68,68,0.04)' : i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg)',
                    borderBottom: '1px solid var(--border-dim)',
                    borderLeft: cve.actively_exploited ? '3px solid var(--danger)' : '3px solid transparent',
                  }}
                >
                  {/* CVE ID */}
                  <td className="px-4 py-2.5" style={{ borderRight: '1px solid var(--border-dim)' }}>
                    <a
                      href={`https://nvd.nist.gov/vuln/detail/${cve.cve_id}`}
                      target="_blank" rel="noreferrer"
                      className="font-mono text-xs font-bold transition-colors"
                      style={{ color: 'var(--brand)' }}
                    >
                      {cve.cve_id}
                    </a>
                    {cve.actively_exploited && (
                      <span
                        className="ml-2 px-1.5 py-0.5 text-[9px] font-black"
                        style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}
                      >
                        KEV
                      </span>
                    )}
                  </td>
                  {/* Software */}
                  <td className="px-4 py-2.5" style={{ borderRight: '1px solid var(--border-dim)' }}>
                    <span style={{ color: 'var(--text)' }}>{cve.software}</span>
                    {cve.version_queried && (
                      <span className="ml-1.5 font-mono" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                        {cve.version_queried}
                      </span>
                    )}
                    {cve.source === 'discovered' && (
                      <span
                        className="ml-1.5 px-1 py-0.5 text-[9px] font-black"
                        style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', fontFamily: 'var(--font-display)' }}
                      >
                        AUTO
                      </span>
                    )}
                  </td>
                  {/* CVSS */}
                  <td className="px-4 py-2.5 font-mono font-bold" style={{ borderRight: '1px solid var(--border-dim)', color: 'var(--text)' }}>
                    {cve.cvss_score ?? '—'}
                  </td>
                  {/* Severity */}
                  <td className="px-4 py-2.5" style={{ borderRight: '1px solid var(--border-dim)' }}>
                    <span
                      className="px-2 py-0.5 text-[9px] font-black tracking-wider"
                      style={{
                        fontFamily: 'var(--font-display)',
                        background: sev.bg,
                        color: sev.text,
                        border: `1px solid ${sev.border}`,
                        letterSpacing: '0.1em',
                      }}
                    >
                      {t(`severity.${cve.severity}`, cve.severity)}
                    </span>
                  </td>
                  {/* Vector */}
                  <td className="px-4 py-2.5 font-mono text-[10px]" style={{ borderRight: '1px solid var(--border-dim)', color: 'var(--text-secondary)' }}>
                    {cve.attack_vector || '—'}
                  </td>
                  {/* Published */}
                  <td className="px-4 py-2.5 font-mono text-[10px]" style={{ borderRight: '1px solid var(--border-dim)', color: 'var(--text-secondary)' }}>
                    {cve.published_date || '—'}
                  </td>
                  {/* Patch */}
                  <td className="px-4 py-2.5" style={{ borderRight: '1px solid var(--border-dim)' }}>
                    {cve.patch_available
                      ? <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--safe)' }}>✓ Yes</span>
                      : <span className="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>No</span>
                    }
                  </td>
                  {/* Get Fix */}
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => setFixCve(cve)}
                      className="px-2.5 py-1 text-[9px] font-black tracking-wider uppercase transition-all"
                      style={{
                        fontFamily: 'var(--font-display)',
                        background: 'var(--brand-dim)',
                        border: '1px solid var(--brand)',
                        color: 'var(--brand)',
                        letterSpacing: '0.1em',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--brand)' || e.currentTarget.style.color === 'white'}
                    >
                      {t('cve.get_fix')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {fixCve && <RemediationModal cve={fixCve} onClose={() => setFixCve(null)} />}
    </div>
  );
}
