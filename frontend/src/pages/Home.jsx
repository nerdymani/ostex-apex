import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useScan } from '../App';

const TEASER_FEEDS = [
  { label: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/' },
  { label: 'The Hacker News',   url: 'https://feeds.feedburner.com/TheHackersNews' },
  { label: 'BleepingComputer',  url: 'https://www.bleepingcomputer.com/feed/' },
];

async function fetchFeedTeaser(url) {
  try {
    const r = await fetch(`/api/feed?url=${encodeURIComponent(url)}`);
    if (!r.ok) return [];
    return r.json();
  } catch { return []; }
}

function NewsTeaserCard({ item }) {
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noreferrer"
      className="block group relative overflow-hidden"
      style={{
        border: '1px solid var(--border-dim)',
        transition: 'border-color 0.15s',
        height: 200,
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-dim)'}
    >
      {/* Background image */}
      {item.image && !imgError ? (
        <img
          src={item.image}
          alt=""
          onError={() => setImgError(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s',
          }}
          className="group-hover:scale-105"
        />
      ) : (
        <div
          style={{ position: 'absolute', inset: 0, background: 'var(--bg-elevated)' }}
          className="flex items-center justify-center"
        >
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.08 }}>
            <path d="M16 4L28 10V16C28 22.6 22.8 28.5 16 30C9.2 28.5 4 22.6 4 16V10L16 4Z"
              stroke="var(--brand)" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}

      {/* Dark gradient — bottom two-thirds */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(6,10,21,0.1) 0%, rgba(6,10,21,0.75) 55%, rgba(6,10,21,0.97) 100%)',
      }} />

      {/* Text overlay */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '12px' }}>
        <span
          className="text-[8px] font-black tracking-wider uppercase mb-1.5"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--brand)' }}
        >
          {item.source}
        </span>
        <p
          className="text-xs font-semibold leading-snug line-clamp-3 mb-2"
          style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}
        >
          {item.title}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {item.date}
          </span>
          <span
            className="text-[8px] font-black tracking-wider uppercase flex items-center gap-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--brand)' }}
          >
            Read
            <svg width="7" height="7" viewBox="0 0 12 12" fill="none">
              <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </a>
  );
}

function NewsTeaser() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const results = await Promise.allSettled(TEASER_FEEDS.map(f => fetchFeedTeaser(f.url)));
      if (!live) return;
      const merged = TEASER_FEEDS.flatMap((f, i) => {
        const val = results[i];
        return val.status === 'fulfilled' ? (val.value || []).map(item => ({ ...item, source: f.label })) : [];
      }).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
      setItems(merged);
      setLoading(false);
    })();
    return () => { live = false; };
  }, []);

  return (
    <div
      className="w-full px-6 sm:px-8 lg:px-10 py-5"
      style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-surface)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--brand)' }} />
          <span className="label" style={{ color: 'var(--brand)', fontSize: '8px', letterSpacing: '0.2em' }}>
            Latest Threat Intel
          </span>
        </div>
        <Link
          to="/news"
          className="text-[9px] font-black tracking-wider uppercase flex items-center gap-1 transition-colors"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          Full Feed
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
            <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Loading state — 4-col skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="animate-pulse" style={{ height: 200, background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)' }} />
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', opacity: 1 - i * 0.15 }}>
              <div style={{ width: 52, height: 48, background: 'var(--bg-surface)', flexShrink: 0 }} />
              <div className="flex-1 space-y-2 pt-1">
                <div style={{ height: 9, background: 'var(--bg-surface)', width: '85%' }} />
                <div style={{ height: 9, background: 'var(--bg-surface)', width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cards — featured left, compact right */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((item, i) => (
            <NewsTeaserCard key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

const SOFTWARE_OPTIONS = [
  'WordPress', 'Apache', 'Nginx', 'MySQL', 'PostgreSQL',
  'PHP', 'Python', 'Node.js', 'Windows Server', 'Ubuntu/Linux',
  'Cisco IOS', 'MikroTik', 'cPanel', 'Plesk',
];

const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '200+'];

const SCAN_STEP_IDS = [
  { id: 'recon',    key: 'home.step_recon' },
  { id: 'cve',      key: 'home.step_cve' },
  { id: 'breaches', key: 'home.step_breaches' },
  { id: 'exploited',key: 'home.step_exploited' },
  { id: 'analyse',  key: 'home.step_analyse' },
];

const CAPABILITIES = [
  { id: 'recon',   label: 'Live Port Scan & Fingerprinting' },
  { id: 'cve',     label: 'NVD CVE Database — Real-time Lookup' },
  { id: 'breach',  label: 'HIBP Breach Record Check' },
  { id: 'kev',     label: 'CISA Known Exploited Vulnerabilities' },
  { id: 'ai',      label: 'Groq — Llama 3.3 70B AI Risk Analysis & Briefing' },
  { id: 'ssl',     label: 'SSL/TLS Deep Inspection' },
];

function StepRow({ step, status }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 py-1.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
      <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
        {status === 'loading' && (
          <div className="w-3.5 h-3.5 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin" />
        )}
        {status === 'done' && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" fill="var(--brand)" />
            <path d="M4.5 7L6 8.5L9.5 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {!status && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--border)' }} />}
      </div>
      <span
        className="text-xs font-mono tracking-wide"
        style={{
          color: status === 'done' ? 'var(--brand)' : status === 'loading' ? 'var(--text)' : 'var(--text-secondary)',
        }}
      >
        {t(step.key, step.key)}
        {status === 'loading' && <span className="animate-pulse">...</span>}
      </span>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setScanData } = useScan();

  const [form, setForm] = useState({
    org_name: '', domain: '', software: [], software_versions: {}, employee_range: '11-50',
  });
  const [scanning, setScanning] = useState(false);
  const [stepStatus, setStepStatus] = useState({});
  const [error, setError] = useState('');
  const [ollamaOk, setOllamaOk] = useState(null); // null = checking, true = ok, false = down

  useEffect(() => {
    fetch('/api/settings/test-groq')
      .then(r => r.json())
      .then(d => setOllamaOk(d.status === 'ok'))
      .catch(() => setOllamaOk(false));
  }, []);

  function toggleSoftware(sw) {
    setForm(f => {
      const selected = f.software.includes(sw);
      const newSoftware = selected ? f.software.filter(s => s !== sw) : [...f.software, sw];
      const newVersions = { ...f.software_versions };
      if (selected) delete newVersions[sw];
      return { ...f, software: newSoftware, software_versions: newVersions };
    });
  }

  function setVersion(sw, version) {
    setForm(f => ({ ...f, software_versions: { ...f.software_versions, [sw]: version } }));
  }

  function setStep(id, status) {
    setStepStatus(prev => ({ ...prev, [id]: status }));
  }

  async function runScan() {
    if (!form.org_name.trim() || !form.domain.trim()) { setError(t('home.error_required')); return; }
    if (form.software.length === 0) { setError(t('home.error_software')); return; }
    setError(''); setScanning(true); setStepStatus({});

    try {
      const profileRes = await fetch('/api/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const { scan_id } = await profileRes.json();
      const results = { scan_id, profile: form };

      setStep('recon', 'loading');
      const reconData = await (await fetch('/api/scan/recon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scan_id }) })).json();
      results.reconData = reconData;
      setStep('recon', 'done');

      setStep('cve', 'loading');
      const cveData = await (await fetch('/api/scan/cve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scan_id }) })).json();
      results.cves = cveData.cves || []; results.cveErrors = cveData.errors || [];
      setStep('cve', 'done');

      setStep('breaches', 'loading');
      const breachData = await (await fetch('/api/scan/breaches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scan_id }) })).json();
      results.breaches = breachData.breaches || []; results.breachMessage = breachData.message;
      results.breachConfigured = breachData.configured !== false;
      setStep('breaches', 'done');

      setStep('exploited', 'loading');
      const exploitedData = await (await fetch('/api/scan/exploited', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scan_id }) })).json();
      results.exploited = exploitedData.matches || [];
      if (cveData.cves) {
        const exploitedIds = new Set(results.exploited.map(e => e.cve_id));
        results.cves = results.cves.map(c => ({ ...c, actively_exploited: exploitedIds.has(c.cve_id) }));
      }
      setStep('exploited', 'done');

      setStep('analyse', 'loading');
      let analysisData = null;
      try {
        const analyseRes = await fetch('/api/analyse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scan_id }) });
        if (analyseRes.ok) { const ad = await analyseRes.json(); analysisData = ad.analysis; }
        else { const err = await analyseRes.json(); results.analysisError = err.detail || 'AI analysis failed.'; }
      } catch (e) { results.analysisError = e.message; }
      results.analysis = analysisData;
      setStep('analyse', 'done');

      setScanData(results);
      navigate('/results');
    } catch (e) {
      setError(`Scan failed: ${e.message}`);
      setScanning(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">
      {/* Ollama unreachable banner */}
      {ollamaOk === false && (
        <div
          className="flex items-center gap-3 px-5 py-2.5"
          style={{ background: 'rgba(245,158,11,0.07)', borderBottom: '1px solid rgba(245,158,11,0.25)' }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
            <path d="M8 2L14.5 13H1.5L8 2Z" fill="#f59e0b" />
            <path d="M8 6v3M8 10.5v.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-mono" style={{ color: '#f59e0b' }}>
            Groq API key not configured — AI features will be limited.
          </span>
          <a href="/settings" className="text-xs font-black tracking-wider uppercase ml-1"
            style={{ fontFamily: 'var(--font-display)', color: '#f59e0b', textDecoration: 'underline' }}>
            Go to Settings →
          </a>
        </div>
      )}

      {/* ── NEWS STRIP — always visible at top ──────────────────────── */}
      <NewsTeaser />

    <div className="flex-1 flex flex-col lg:flex-row">

      {/* ── LEFT BRAND PANEL ─────────────────────────────────────────── */}
      <div
        className="lg:w-[42%] flex flex-col justify-between p-8 lg:p-12 lg:sticky lg:top-14 lg:h-[calc(100vh-56px)]"
        style={{ borderRight: '1px solid var(--border-dim)' }}
      >
        {/* Top: wordmark + tagline */}
        <div>
          {/* Classification badge */}
          <div className="flex items-center gap-2 mb-10 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1" style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand)', borderLeft: '3px solid var(--brand)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--brand)' }} />
              <span className="label" style={{ color: 'var(--brand)', fontSize: '8px', letterSpacing: '0.22em' }}>
                Live System
              </span>
            </div>
            {ollamaOk === true && (
              <div className="flex items-center gap-1.5 px-2.5 py-1" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
                <span className="label" style={{ color: '#10b981', fontSize: '8px' }}>
                  AI Ready — Llama 3.3 70B
                </span>
              </div>
            )}
            {ollamaOk === false && (
              <div className="flex items-center gap-1.5 px-2.5 py-1" style={{ border: '1px solid var(--warning)', background: 'rgba(245,158,11,0.07)' }}>
                <span className="label" style={{ color: 'var(--warning)', fontSize: '8px' }}>
                  Groq key not configured — AI features limited
                </span>
              </div>
            )}
          </div>

          {/* Wordmark */}
          <div className="mb-6">
            <h1
              className="font-black leading-none tracking-tight"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(52px, 7vw, 88px)', lineHeight: 0.92 }}
            >
              <span style={{ color: 'var(--brand)' }}>OSTEX</span>
              <br />
              <span style={{ color: 'var(--text)' }}>APEX</span>
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-base leading-relaxed mb-10 max-w-xs" style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
            Identify threats before they find you. Built for East African organizations operating in high-risk digital environments.
          </p>

          {/* Capability list */}
          <div className="space-y-0" style={{ borderTop: '1px solid var(--border-dim)' }}>
            {CAPABILITIES.map((cap, i) => (
              <div
                key={cap.id}
                className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: '1px solid var(--border-dim)' }}
              >
                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--brand)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                  {cap.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: stats line */}
        <div className="hidden lg:flex items-center gap-6 mt-8 pt-6" style={{ borderTop: '1px solid var(--border-dim)' }}>
          {[['NVD', 'CVE Database'], ['CISA KEV', 'Live Feed'], ['HIBP', 'Breach Records'], ['Groq', 'Llama 3.3 70B']].map(([name, desc]) => (
            <div key={name}>
              <div className="text-xs font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--brand)', letterSpacing: '0.1em' }}>{name}</div>
              <div className="label mt-0.5" style={{ fontSize: '8px' }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-start p-6 lg:p-10 overflow-y-auto">

        {/* Panel header */}
        <div className="mb-8 pb-4" style={{ borderBottom: '1px solid var(--border-dim)' }}>
          <div className="label mb-1.5" style={{ color: 'var(--brand)' }}>Mission Briefing</div>
          <h2
            className="font-black tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text)' }}
          >
            TARGET PROFILE
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Define the target organization to initiate threat assessment.
          </p>
        </div>

        <div className="space-y-6 max-w-xl">

          {/* Org name + Domain — side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label mb-2 block">
                {t('home.org_name')} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                value={form.org_name}
                onChange={e => setForm(f => ({ ...f, org_name: e.target.value }))}
                placeholder="Tanzania Telecom Ltd"
                disabled={scanning}
                className="w-full px-3 py-2.5 text-sm transition-colors disabled:opacity-40"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label className="label mb-2 block">
                {t('home.domain')} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                value={form.domain}
                onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                placeholder="company.co.tz"
                disabled={scanning}
                className="w-full px-3 py-2.5 text-sm transition-colors disabled:opacity-40"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          {/* Software stack */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label">
                {t('home.software_stack')} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <span className="label" style={{ color: 'var(--brand)' }}>
                {form.software.length} {t('home.software_selected')}
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Select software. Add version for precise CVE matching.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {SOFTWARE_OPTIONS.map(sw => {
                const selected = form.software.includes(sw);
                return (
                  <div key={sw} className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={scanning}
                      onClick={() => toggleSoftware(sw)}
                      className="px-3 py-2 text-xs text-left font-medium transition-all disabled:opacity-40"
                      style={{
                        background: selected ? 'var(--brand-dim)' : 'var(--bg-surface)',
                        border: selected ? '1px solid var(--brand)' : '1px solid var(--border)',
                        borderLeft: selected ? '3px solid var(--brand)' : '1px solid var(--border)',
                        color: selected ? 'var(--brand)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span className="mr-1.5">{selected ? '▶' : '○'}</span>
                      {sw}
                    </button>
                    {selected && (
                      <input
                        type="text"
                        value={form.software_versions[sw] || ''}
                        onChange={e => setVersion(sw, e.target.value)}
                        placeholder="version e.g. 8.0"
                        disabled={scanning}
                        className="px-2.5 py-1.5 text-xs transition-colors disabled:opacity-40"
                        style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--brand)',
                          borderLeft: '2px solid var(--brand)',
                          color: 'var(--brand)',
                          fontFamily: 'var(--font-mono)',
                          outline: 'none',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Employee range */}
          <div>
            <label className="label mb-2 block">{t('home.employee_range')}</label>
            <select
              value={form.employee_range}
              onChange={e => setForm(f => ({ ...f, employee_range: e.target.value }))}
              disabled={scanning}
              className="w-full px-3 py-2.5 text-sm appearance-none disabled:opacity-40"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontFamily: 'var(--font-body)',
                outline: 'none',
              }}
            >
              {EMPLOYEE_RANGES.map(r => (
                <option key={r} value={r}>{r} {t('home.employees')}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 text-xs" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderLeft: '3px solid var(--danger)', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
              ✕ {error}
            </div>
          )}

          {/* Progress steps */}
          {scanning && (
            <div className="py-1" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderLeft: '3px solid var(--brand)' }}>
              <div className="px-4 py-2 label" style={{ color: 'var(--brand)', borderBottom: '1px solid var(--border-dim)' }}>
                Scan in progress
              </div>
              <div className="px-4 py-1">
                {SCAN_STEP_IDS.map(s => (
                  <StepRow key={s.id} step={s} status={stepStatus[s.id]} />
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={runScan}
            disabled={scanning}
            className="w-full py-3.5 text-white text-sm font-black tracking-[0.14em] uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            style={{
              background: scanning ? 'var(--bg-elevated)' : 'var(--brand)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.18em',
              boxShadow: scanning ? 'none' : '0 0 32px var(--brand-glow)',
            }}
          >
            {scanning ? (
              <>
                <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                {t('home.scanning')}
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                {t('home.run_scan')}
              </>
            )}
          </button>

        </div>
      </div>
    </div>
    </div>
  );
}
