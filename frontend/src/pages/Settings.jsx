import React, { useState, useEffect } from 'react';

const EXTERNAL_KEYS = [
  {
    id: 'HIBP_API_KEY',
    label: 'Have I Been Pwned API Key',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    link: 'https://haveibeenpwned.com/API/Key',
    linkLabel: 'Get HIBP API Key',
    desc: 'Required to scan your domain for data breach records.',
  },
  {
    id: 'NVD_API_KEY',
    label: 'NVD API Key',
    placeholder: 'Optional — higher rate limit with a key',
    link: 'https://nvd.nist.gov/developers/request-an-api-key',
    linkLabel: 'Request NVD API Key',
    desc: 'Optional. Without this key, NVD CVE queries use the public rate limit (5 req/30s).',
    optional: true,
  },
];

function KeyField({ config, masked, onSave, onTest }) {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    await onSave(config.id, value.trim());
    setValue('');
    setSaving(false);
    setTestResult(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const result = await onTest(config.id);
    setTestResult(result);
    setTesting(false);
  }

  const isConfigured = masked && masked.length > 0;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-dim)',
        borderLeft: isConfigured ? '3px solid var(--brand)' : '3px solid var(--border)',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
            {config.label}
          </h3>
          {config.optional && (
            <span
              className="px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase"
              style={{ fontFamily: 'var(--font-display)', background: 'var(--bg)', border: '1px solid var(--border-dim)', color: 'var(--text-secondary)' }}
            >
              Optional
            </span>
          )}
        </div>
        {isConfigured ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--brand)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--brand)' }} />
            Configured
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--border-bright)' }} />
            Not configured
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{config.desc}</p>

        {isConfigured && (
          <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            <span>Current:</span>
            <span className="px-2 py-1" style={{ background: 'var(--bg)', border: '1px solid var(--border-dim)', color: 'var(--text)' }}>
              {masked}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type={show ? 'text' : 'password'}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={isConfigured ? 'Enter new key to replace...' : config.placeholder}
              className="w-full px-4 py-2.5 pr-10 text-sm font-mono focus:outline-none transition-colors"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onFocus={e => e.target.style.borderColor = 'var(--brand)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <button
              onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              tabIndex={-1}
            >
              {show ? (
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !value.trim()}
            className="px-5 py-2.5 text-xs font-black tracking-wider uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-display)', background: 'var(--brand)', color: 'white', border: 'none' }}
          >
            {saving ? '...' : 'Save'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleTest}
            disabled={testing || !isConfigured}
            className="text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
            onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            {testing ? (
              <span className="w-3 h-3 rounded-full border border-t-transparent animate-spin inline-block"
                style={{ borderColor: 'var(--border-bright)', borderTopColor: 'var(--text)' }} />
            ) : (
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            Test connection
          </button>
          <a href={config.link} target="_blank" rel="noreferrer"
            className="text-xs transition-colors" style={{ color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>
            {config.linkLabel} →
          </a>
        </div>

        {testResult && (
          <div className="px-3 py-2 text-xs font-mono"
            style={testResult.ok
              ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }
              : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)' }
            }>
            {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}

function GroqSection({ masked, onSave }) {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const isConfigured = masked && masked.length > 0;

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    await onSave('GROQ_API_KEY', value.trim());
    setValue('');
    setSaving(false);
    setTestResult(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch('/api/settings/test-groq');
      const d = await r.json();
      setTestResult(d.status === 'ok'
        ? { ok: true, message: `Connected — Llama 3.3 70B responded: "${d.response}"` }
        : { ok: false, message: d.message });
    } catch (e) {
      setTestResult({ ok: false, message: e.message });
    }
    setTesting(false);
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--brand)' }}>
      {/* Header */}
      <div className="px-5 py-4" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-dim)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
                Groq AI
              </h3>
              <span
                className="px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase"
                style={{ fontFamily: 'var(--font-display)', background: 'var(--brand-dim)', border: '1px solid var(--brand)', color: 'var(--brand)' }}
              >
                Llama 3.3 70B
              </span>
            </div>
            <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              Free API — 14,400 requests/day · 1–2 second response times
            </p>
          </div>
          {isConfigured ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--brand)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--brand)' }} />
              Configured
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--border-bright)' }} />
              Not configured
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Powers risk analysis, executive summaries, remediation guides, and the Apex chatbot.
          Get a free API key at{' '}
          <a href="https://console.groq.com" target="_blank" rel="noreferrer"
            style={{ color: 'var(--brand)' }}>
            console.groq.com
          </a>
          {' '}— no credit card required.
        </p>

        {isConfigured && (
          <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            <span>Current key:</span>
            <span className="px-2 py-1" style={{ background: 'var(--bg)', border: '1px solid var(--border-dim)', color: 'var(--text)' }}>
              {masked}
            </span>
          </div>
        )}

        {/* Key input */}
        <div>
          <label className="label mb-2 block">Groq API Key</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={isConfigured ? 'Enter new key to replace...' : 'gsk_...'}
                className="w-full px-4 py-2.5 pr-10 text-sm font-mono focus:outline-none transition-colors"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <button
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                tabIndex={-1}
              >
                {show ? (
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !value.trim()}
              className="px-5 py-2.5 text-xs font-black tracking-wider uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontFamily: 'var(--font-display)', background: 'var(--brand)', color: 'white', border: 'none' }}
            >
              {saving ? '...' : 'Save'}
            </button>
          </div>
          <p className="text-xs mt-1.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
            Free API key from console.groq.com — 14,400 requests per day free
          </p>
        </div>

        {/* Test button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={testing || !isConfigured}
            className="flex items-center gap-2 px-4 py-2 text-xs font-black tracking-wider uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            {testing ? (
              <span className="w-3 h-3 rounded-full border border-t-transparent animate-spin"
                style={{ borderColor: 'var(--border-bright)', borderTopColor: 'var(--text)' }} />
            ) : (
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <a href="https://console.groq.com" target="_blank" rel="noreferrer"
            className="text-xs transition-colors" style={{ color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>
            console.groq.com →
          </a>
        </div>

        {testResult && (
          <div className="px-3 py-2 text-xs font-mono"
            style={testResult.ok
              ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }
              : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)' }
            }>
            {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [saveStatus, setSaveStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { setSettings(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function saveKey(keyName, value) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [keyName]: value }),
    });
    if (res.ok) {
      setSaveStatus('Saved!');
      const updated = await fetch('/api/settings').then(r => r.json());
      setSettings(updated);
      setTimeout(() => setSaveStatus(''), 2000);
    }
  }

  async function testKey(keyName) {
    const res = await fetch(`/api/settings/test/${keyName}`, { method: 'POST' });
    return res.json();
  }

  if (loading) {
    return (
      <div className="pt-20 text-center">
        <div className="inline-block w-5 h-5 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  const maskedMap = {
    HIBP_API_KEY: settings.HIBP_API_KEY,
    NVD_API_KEY: settings.NVD_API_KEY,
  };

  return (
    <div className="pt-10 pb-16 max-w-2xl mx-auto px-4">
      {/* Page header */}
      <div className="mb-8">
        <div
          className="text-3xl font-black tracking-wider uppercase mb-1"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Settings
        </div>
        <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          Configure AI and API keys for Ostex Apex services.
        </p>
      </div>

      {saveStatus && (
        <div className="mb-4 px-4 py-2 text-xs font-mono"
          style={{ background: 'rgba(240,100,34,0.08)', border: '1px solid var(--brand)', color: 'var(--brand)' }}>
          ✓ {saveStatus}
        </div>
      )}

      <div className="space-y-4">
        {/* Groq section first */}
        <GroqSection masked={settings.GROQ_API_KEY} onSave={saveKey} />

        {/* Divider */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px" style={{ background: 'var(--border-dim)' }} />
          <span className="label" style={{ fontSize: '8px' }}>External API Keys</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-dim)' }} />
        </div>

        {/* Security note */}
        <div className="px-5 py-4"
          style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.25)', borderLeft: '3px solid #f59e0b' }}>
          <div className="label mb-1" style={{ color: '#f59e0b' }}>Security Note</div>
          <p className="text-xs leading-relaxed" style={{ color: '#fde68a', opacity: 0.8 }}>
            API keys are stored locally in{' '}
            <code className="font-mono" style={{ color: '#fde68a' }}>config.json</code>.
            Do not commit this file to version control.
          </p>
        </div>

        {EXTERNAL_KEYS.map(cfg => (
          <KeyField
            key={cfg.id}
            config={cfg}
            masked={maskedMap[cfg.id]}
            onSave={saveKey}
            onTest={testKey}
          />
        ))}
      </div>
    </div>
  );
}
