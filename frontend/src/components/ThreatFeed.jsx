import React, { useEffect, useState } from 'react';

const FEEDS = [
  { label: 'ESET', url: 'https://feeds.feedburner.com/eset/blog' },
  { label: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/' },
];

async function fetchFeed(url) {
  const r = await fetch(`/api/feed?url=${encodeURIComponent(url)}`);
  if (!r.ok) return [];
  return r.json();
}

export default function ThreatFeed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('All');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const results = await Promise.all(FEEDS.map(f => fetchFeed(f.url)));
        const merged = FEEDS.flatMap((f, i) => (results[i] || []).map(item => ({ ...item, source: f.label })))
          .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
        if (live) setItems(merged);
      } catch { }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, []);

  const sources = ['All', ...FEEDS.map(f => f.label)];
  const filtered = active === 'All' ? items : items.filter(i => i.source === active);

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-wrap gap-2"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-dim)' }}
      >
        <span className="label" style={{ color: 'var(--brand)' }}>Live Intelligence Feed</span>
        <div className="flex gap-1">
          {sources.map(s => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className="px-3 py-1 text-[9px] font-black tracking-wider uppercase transition-colors"
              style={{
                fontFamily: 'var(--font-display)',
                background: active === s ? 'var(--brand-dim)' : 'transparent',
                border: active === s ? '1px solid var(--brand)' : '1px solid var(--border-dim)',
                color: active === s ? 'var(--brand)' : 'var(--text-secondary)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div
            className="inline-block w-4 h-4 rounded-full border border-orange-500/30 border-t-orange-500 animate-spin mb-3"
          />
          <p className="data" style={{ color: 'var(--text-secondary)' }}>Loading threat feed...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-6 text-center">
          <p className="data" style={{ color: 'var(--text-secondary)' }}>Feed unavailable.</p>
        </div>
      ) : (
        <ul>
          {filtered.map((item, i) => (
            <li
              key={i}
              className="px-5 py-3.5 transition-colors"
              style={{
                borderBottom: '1px solid var(--border-dim)',
                borderLeft: '3px solid transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.borderLeftColor = 'var(--brand)'}
              onMouseLeave={e => e.currentTarget.style.borderLeftColor = 'transparent'}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <a
                    href={item.link} target="_blank" rel="noreferrer"
                    className="text-sm font-medium transition-colors line-clamp-2 block"
                    style={{ color: 'var(--text)' }}
                    onMouseEnter={e => e.target.style.color = 'var(--brand)'}
                    onMouseLeave={e => e.target.style.color = 'var(--text)'}
                  >
                    {item.title}
                  </a>
                  {item.summary && (
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{item.summary}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="label block" style={{ color: 'var(--brand)', fontSize: '8px' }}>{item.source}</span>
                  <span className="label block mt-0.5" style={{ fontSize: '8px' }}>{item.date}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
