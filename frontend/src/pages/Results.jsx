import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useScan } from '../App';
import RiskGauge from '../components/RiskGauge';
import CVETable from '../components/CVETable';
import BreachCard from '../components/BreachCard';
import AIAnalysis from '../components/AIAnalysis';
import SSLInspector from '../components/SSLInspector';
import AskApex from '../components/AskApex';
import DiscoveredServices from '../components/DiscoveredServices';

function riskColor(score) {
  if (score >= 70) return 'var(--danger)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--safe)';
}
function riskBg(score) {
  if (score >= 70) return 'rgba(239,68,68,0.06)';
  if (score >= 40) return 'rgba(245,158,11,0.06)';
  return 'rgba(16,185,129,0.06)';
}

// Chapter heading — large editorial section marker
function Chapter({ number, title, children }) {
  return (
    <section className="mb-20">
      <div className="flex items-baseline gap-5 mb-8">
        <span
          className="font-black leading-none select-none"
          style={{ fontFamily: 'var(--font-display)', fontSize: 72, color: 'var(--border)', lineHeight: 1 }}
        >
          {String(number).padStart(2, '0')}
        </span>
        <div>
          <h2
            className="font-black tracking-wide uppercase"
            style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', letterSpacing: '0.12em' }}
          >
            {title}
          </h2>
          <div className="h-px mt-2" style={{ background: 'var(--border-dim)', width: '100%' }} />
        </div>
      </div>
      {children}
    </section>
  );
}

// Inline stat callout — number + prose context
function StatCallout({ number, label, color }) {
  return (
    <div className="flex items-baseline gap-3">
      <span
        className="font-black leading-none"
        style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: color || 'var(--text)', lineHeight: 1 }}
      >
        {number}
      </span>
      <span className="text-sm leading-tight max-w-[120px]" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { scanData } = useScan();
  const [downloading, setDownloading] = useState(false);
  const [lang, setLang] = useState('en');

  if (!scanData) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div
            className="font-black mb-4"
            style={{ fontFamily: 'var(--font-display)', fontSize: 64, color: 'var(--border)', lineHeight: 1 }}
          >
            404
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
            No assessment found
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            {t('results.no_results')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 text-white text-xs font-black tracking-[0.16em] uppercase"
            style={{ background: 'var(--brand)', fontFamily: 'var(--font-display)', boxShadow: '0 0 24px var(--brand-glow)' }}
          >
            {t('results.run_scan_btn')}
          </button>
        </div>
      </div>
    );
  }

  const {
    profile, cves = [], breaches = [], exploited = [],
    analysis, analysisError, breachMessage, breachConfigured,
    cveErrors = [], reconData,
  } = scanData;

  const criticalCves = cves.filter(c => c.severity === 'Critical');
  const highCves     = cves.filter(c => c.severity === 'High');
  const riskScore    = analysis?.risk_score ?? null;
  const riskLevel    = analysis?.risk_level ?? 'Pending';
  const scanDate     = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  async function downloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch('/api/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_id: scanData.scan_id }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = 'Report generation failed.';
        try { msg = JSON.parse(text).detail || msg; } catch {}
        alert(msg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `OstexApex_${profile.org_name.replace(/\s/g, '_')}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { alert('Download failed: ' + e.message); }
    finally { setDownloading(false); }
  }

  return (
    <div style={{ background: 'var(--bg)' }}>

      {/* ── COVER ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: riskScore !== null ? riskBg(riskScore) : 'var(--bg-surface)',
          borderBottom: `1px solid ${riskScore !== null ? riskColor(riskScore) : 'var(--border-dim)'}`,
          borderBottomWidth: 2,
        }}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 pt-12 pb-10">

          {/* Meta row */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div
                className="px-2.5 py-1 text-[8px] font-black tracking-[0.22em] uppercase flex items-center gap-1.5"
                style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand)', color: 'var(--brand)', fontFamily: 'var(--font-display)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--brand)' }} />
                Threat Assessment
              </div>
              <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                {scanDate}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                {profile.domain}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 text-[10px] font-black tracking-[0.12em] uppercase transition-colors"
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                {t('results.new_scan')}
              </button>
              <button
                onClick={downloadPdf}
                disabled={downloading}
                className="px-4 py-2 text-white text-[10px] font-black tracking-[0.12em] uppercase transition-all disabled:opacity-50 flex items-center gap-2"
                style={{ background: 'var(--brand)', fontFamily: 'var(--font-display)', boxShadow: '0 0 16px var(--brand-glow)' }}
              >
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                </svg>
                {downloading ? t('results.generating') : 'PDF Report'}
              </button>
            </div>
          </div>

          {/* Org name + risk verdict */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-12">
            <div className="flex-1">
              <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-secondary)' }}>
                {profile.employee_range} employees · {profile.software?.join(', ')}
              </p>
              <h1
                className="font-black leading-none tracking-tight"
                style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 7vw, 96px)', color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 0.9 }}
              >
                {profile.org_name.toUpperCase()}
              </h1>
              {riskScore !== null && (
                <div className="flex items-center gap-4 mt-5">
                  <div
                    className="font-black tracking-wider uppercase px-4 py-1.5 text-sm"
                    style={{ fontFamily: 'var(--font-display)', background: riskBg(riskScore), border: `1px solid ${riskColor(riskScore)}`, color: riskColor(riskScore) }}
                  >
                    {riskLevel} Risk
                  </div>
                  <div
                    className="font-black"
                    style={{ fontFamily: 'var(--font-display)', fontSize: 52, color: riskColor(riskScore), lineHeight: 1 }}
                  >
                    {riskScore}
                    <span className="text-xl ml-1" style={{ color: 'var(--text-secondary)' }}>/100</span>
                  </div>
                </div>
              )}
              {riskScore === null && (
                <div className="mt-4 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                  Risk score pending AI analysis
                </div>
              )}
            </div>
            <div className="lg:flex-shrink-0">
              <RiskGauge score={analysis?.risk_score ?? 0} level={analysis?.risk_level ?? '—'} />
            </div>
          </div>

          {/* Stat strip */}
          <div
            className="flex flex-wrap gap-8 mt-10 pt-8"
            style={{ borderTop: '1px solid var(--border-dim)' }}
          >
            <StatCallout
              number={cves.length}
              label="vulnerabilities found"
              color={cves.length > 0 ? 'var(--text)' : 'var(--text-secondary)'}
            />
            <StatCallout
              number={criticalCves.length}
              label="critical severity"
              color={criticalCves.length > 0 ? 'var(--danger)' : 'var(--text-secondary)'}
            />
            <StatCallout
              number={exploited.length}
              label="actively exploited"
              color={exploited.length > 0 ? 'var(--danger)' : 'var(--text-secondary)'}
            />
            <StatCallout
              number={breaches.length}
              label="breach records"
              color={breaches.length > 0 ? 'var(--warning)' : 'var(--text-secondary)'}
            />
          </div>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 pt-16 pb-32">

        {/* ── BREAKING ALERT ─────────────────────────────────────────────── */}
        {exploited.length > 0 && (
          <div
            className="mb-20 p-6"
            style={{ background: 'rgba(239,68,68,0.05)', border: '2px solid var(--danger)' }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--danger)' }} />
              <span
                className="font-black tracking-[0.16em] uppercase"
                style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--danger)' }}
              >
                ⚡ Active Exploitation Confirmed — {exploited.length} CISA KEV Match{exploited.length !== 1 ? 'es' : ''}
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-6 max-w-2xl" style={{ color: 'rgba(239,68,68,0.75)' }}>
              {t('results.exploited_desc')}
            </p>
            <div className="space-y-3">
              {exploited.map((e, i) => (
                <div
                  key={i}
                  className="flex items-start gap-5 p-4"
                  style={{ background: 'rgba(239,68,68,0.04)', borderLeft: '3px solid var(--danger)' }}
                >
                  <span className="font-mono text-sm font-bold flex-shrink-0 mt-0.5" style={{ color: 'var(--danger)' }}>
                    {e.cve_id}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>{e.vulnerability_name}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {e.vendor_project} · {e.product} · Due: {e.due_date || 'ASAP'}
                    </p>
                    {e.required_action && (
                      <p className="text-xs mt-2" style={{ color: 'var(--warning)' }}>→ {e.required_action}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CHAPTER 1: EXECUTIVE SUMMARY ──────────────────────────────── */}
        <Chapter number={1} title="Executive Summary">
          {analysisError && (
            <div className="mb-6 p-4 text-sm font-mono" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderLeft: '3px solid var(--warning)', color: 'var(--warning)' }}>
              {analysisError}
            </div>
          )}

          {analysis ? (
            <div className="space-y-8">
              {/* Language toggle */}
              <div className="flex gap-0" style={{ borderBottom: '1px solid var(--border-dim)', display: 'inline-flex' }}>
                {[['en', 'English'], ['sw', 'Kiswahili']].map(([l, label]) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className="px-5 py-2.5 text-[10px] font-black tracking-[0.14em] uppercase transition-colors"
                    style={{
                      fontFamily: 'var(--font-display)',
                      background: 'transparent',
                      color: lang === l ? 'var(--brand)' : 'var(--text-secondary)',
                      borderBottom: lang === l ? '2px solid var(--brand)' : '2px solid transparent',
                      marginBottom: '-1px',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Summary prose */}
              <p
                className="text-lg leading-relaxed max-w-3xl"
                style={{ color: 'var(--text)', fontFamily: 'var(--font-body)', fontWeight: 400 }}
              >
                {lang === 'en'
                  ? (analysis.executive_summary_english || 'No English summary available.')
                  : (analysis.executive_summary_swahili || 'Hakuna muhtasari wa Kiswahili.')}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Business impact */}
                {analysis.business_impact && (
                  <div
                    className="p-6"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderTop: '3px solid var(--warning)' }}
                  >
                    <div className="label mb-3" style={{ color: 'var(--warning)' }}>Business Impact</div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {analysis.business_impact}
                    </p>
                  </div>
                )}

                {/* Regulatory note */}
                {analysis.tanzanian_regulatory_note && (
                  <div
                    className="p-6"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderTop: '3px solid var(--info)' }}
                  >
                    <div className="label mb-3" style={{ color: 'var(--info)' }}>TCRA / Data Protection</div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {analysis.tanzanian_regulatory_note}
                    </p>
                  </div>
                )}
              </div>

              {/* Top actions */}
              {analysis.top_5_actions?.length > 0 && (
                <div>
                  <div className="label mb-5">Recommended Actions</div>
                  <ol className="space-y-3">
                    {analysis.top_5_actions.map((action, i) => (
                      <li key={i} className="flex gap-5 items-start">
                        <span
                          className="flex-shrink-0 font-black text-white flex items-center justify-center"
                          style={{
                            fontFamily: 'var(--font-display)',
                            background: 'var(--brand)',
                            width: 28,
                            height: 28,
                            fontSize: 12,
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </span>
                        <p className="text-sm leading-relaxed pt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {action}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div
              className="p-8 text-center"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderLeft: '3px solid var(--border-bright)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No AI analysis available. Configure Ollama in Settings.
              </p>
            </div>
          )}
        </Chapter>

        {/* ── CHAPTER 2: CVE INTELLIGENCE ───────────────────────────────── */}
        <Chapter number={2} title="Vulnerability Intelligence">
          {cveErrors.length > 0 && (
            <div className="mb-4 p-3 text-xs font-mono" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderLeft: '3px solid var(--warning)', color: 'var(--warning)' }}>
              {cveErrors.map((e, i) => <div key={i}>⚠ {e}</div>)}
            </div>
          )}

          {/* Context line */}
          <p className="text-sm mb-6 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            {cves.length === 0
              ? 'No vulnerabilities identified for the declared software stack.'
              : `${cves.length} vulnerabilities identified — ${criticalCves.length} critical, ${highCves.length} high severity. ${exploited.length > 0 ? `${exploited.length} confirmed as actively exploited in the wild.` : 'None confirmed as actively exploited.'}`}
          </p>

          <CVETable cves={cves} />
        </Chapter>

        {/* ── CHAPTER 3: DISCOVERED SERVICES ────────────────────────────── */}
        {reconData && (
          <Chapter number={3} title="Network Reconnaissance">
            <p className="text-sm mb-6 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
              Live port scan and HTTP fingerprinting performed against {profile.domain}. Services exposed to the internet are listed below.
            </p>
            <DiscoveredServices reconData={reconData} />
          </Chapter>
        )}

        {/* ── CHAPTER 4: BREACH INTELLIGENCE ───────────────────────────── */}
        <Chapter number={reconData ? 4 : 3} title="Breach Intelligence">
          {!breachConfigured ? (
            <div
              className="p-6"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderLeft: '3px solid var(--warning)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {breachMessage || t('results.hibp_not_config')}
              </p>
            </div>
          ) : breaches.length === 0 ? (
            <div
              className="p-6"
              style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.18)', borderLeft: '3px solid var(--safe)' }}
            >
              <div className="flex items-center gap-3">
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="7" fill="#10b981" />
                  <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-sm font-semibold" style={{ color: 'var(--safe)' }}>
                  No breach records found for {profile.domain}
                </p>
              </div>
              {breachMessage && (
                <p className="text-xs mt-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{breachMessage}</p>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm mb-6 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                {breaches.length} breach record{breaches.length !== 1 ? 's' : ''} found associated with {profile.domain}. Credentials, personal data, or other sensitive information may have been exposed.
              </p>
              <div className="space-y-2">
                {breaches.map((b, i) => <BreachCard key={i} breach={b} />)}
              </div>
            </>
          )}
        </Chapter>

        {/* ── CHAPTER 5: SSL / TLS ──────────────────────────────────────── */}
        <Chapter number={reconData ? 5 : 4} title="SSL / TLS Inspection">
          <p className="text-sm mb-6 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            Certificate validity, protocol support, and configuration security for {profile.domain}.
          </p>
          <SSLInspector defaultDomain={profile.domain} />
        </Chapter>

      </div>

      <AskApex scanComplete={true} scanData={scanData} />
    </div>
  );
}
