import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';

const FEEDS = [
  { label: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/' },
  { label: 'The Hacker News',   url: 'https://feeds.feedburner.com/TheHackersNews' },
  { label: 'BleepingComputer',  url: 'https://www.bleepingcomputer.com/feed/' },
  { label: 'SecurityWeek',      url: 'https://feeds.feedburner.com/Securityweek' },
  { label: 'ESET',              url: 'https://feeds.feedburner.com/eset/blog' },
  { label: 'Threatpost',        url: 'https://threatpost.com/feed/' },
];

const PAGE_SIZE = 12;

async function fetchFeed(url) {
  try {
    const r = await fetch(`/api/feed?url=${encodeURIComponent(url)}`);
    if (!r.ok) return [];
    return r.json();
  } catch {
    return [];
  }
}

function NewsCard({ item }) {
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col group"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-dim)',
        overflow: 'hidden',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--brand)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-dim)';
      }}
    >
      {/* Image */}
      <div style={{ height: 168, background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {item.image && !imgError ? (
          <img
            src={item.image}
            alt=""
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
            className="group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.12 }}>
              <path d="M16 4L28 10V16C28 22.6 22.8 28.5 16 30C9.2 28.5 4 22.6 4 16V10L16 4Z"
                stroke="var(--brand)" strokeWidth="1.5" fill="none" />
              <path d="M11 16L14.5 19.5L21 13" stroke="var(--brand)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        {/* Source overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2"
          style={{ background: 'linear-gradient(transparent, rgba(6,10,21,0.92))' }}>
          <span className="text-[9px] font-black tracking-wider uppercase"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--brand)' }}>
            {item.source}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-sm font-semibold leading-snug mb-2 line-clamp-2"
          style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
          {item.title}
        </p>
        {item.summary && (
          <p className="text-xs leading-relaxed line-clamp-2 flex-1"
            style={{ color: 'var(--text-secondary)' }}>
            {item.summary}
          </p>
        )}
        <div className="mt-3 pt-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border-dim)' }}>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
            {item.date || '—'}
          </span>
          <span className="text-[9px] font-black tracking-wider uppercase flex items-center gap-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--brand)' }}>
            Read
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
              <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </a>
  );
}

function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  const btnStyle = (active) => ({
    fontFamily: 'var(--font-display)',
    background: active ? 'var(--brand)' : 'var(--bg-surface)',
    border: active ? '1px solid var(--brand)' : '1px solid var(--border-dim)',
    color: active ? 'white' : 'var(--text-secondary)',
    minWidth: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.05em',
    cursor: active ? 'default' : 'pointer',
    transition: 'all 0.12s',
  });

  return (
    <div className="flex items-center justify-between mt-10 pt-6"
      style={{ borderTop: '1px solid var(--border-dim)' }}>

      <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
        Page {page} of {totalPages} · {total} articles
      </span>

      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 text-xs font-black tracking-wider uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ ...btnStyle(false), paddingLeft: 12, paddingRight: 12 }}
          onMouseEnter={e => { if (page > 1) e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          ← Prev
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs font-mono"
                style={{ color: 'var(--text-secondary)' }}>…</span>
            ) : (
              <button
                key={p}
                onClick={() => p !== page && onChange(p)}
                style={btnStyle(p === page)}
                onMouseEnter={e => { if (p !== page) { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; } }}
                onMouseLeave={e => { if (p !== page) { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 text-xs font-black tracking-wider uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ ...btnStyle(false), paddingLeft: 12, paddingRight: 12 }}
          onMouseEnter={e => { if (page < totalPages) { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default function News() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('All');
  const [loadedFeeds, setLoadedFeeds] = useState(new Set());
  const [page, setPage] = useState(1);
  const topRef = useRef(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const promises = FEEDS.map(async (f) => {
        const results = await fetchFeed(f.url);
        if (!live) return;
        const tagged = (results || []).map(item => ({ ...item, source: f.label }));
        setItems(prev => {
          const merged = [...prev, ...tagged].sort((a, b) => new Date(b.date) - new Date(a.date));
          return merged;
        });
        setLoadedFeeds(prev => new Set([...prev, f.label]));
      });
      await Promise.allSettled(promises);
      if (live) setLoading(false);
    })();
    return () => { live = false; };
  }, []);

  const filtered = active === 'All' ? items : items.filter(i => i.source === active);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(source) {
    setActive(source);
    setPage(1);
  }

  function handlePageChange(p) {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const sources = ['All', ...FEEDS.map(f => f.label)];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16" ref={topRef}>

      {/* Page header */}
      <div className="mb-8 pb-6" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="label mb-1.5" style={{ color: 'var(--brand)' }}>Threat Intelligence</div>
            <h1
              className="font-black tracking-tight leading-none"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,5vw,52px)', color: 'var(--text)' }}
            >
              LATEST SECURITY NEWS
            </h1>
            <p className="mt-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              {loading
                ? `Loading from ${FEEDS.length} sources…`
                : `${items.length} articles from ${FEEDS.length} threat intelligence sources`}
            </p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 text-xs font-black tracking-wider uppercase transition-all self-start"
            style={{ fontFamily: 'var(--font-display)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Run Scan
          </Link>
        </div>

        {/* Source filter tabs */}
        <div className="flex flex-wrap gap-1.5 mt-5">
          {sources.map(s => {
            const count = s === 'All' ? items.length : items.filter(i => i.source === s).length;
            const isLoaded = s === 'All' ? !loading : loadedFeeds.has(s);
            return (
              <button
                key={s}
                onClick={() => handleFilterChange(s)}
                className="px-3 py-1.5 text-[9px] font-black tracking-wider uppercase transition-all"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: active === s ? 'var(--brand-dim)' : 'var(--bg-surface)',
                  border: active === s ? '1px solid var(--brand)' : '1px solid var(--border-dim)',
                  color: active === s ? 'var(--brand)' : 'var(--text-secondary)',
                }}
              >
                {s}
                <span style={{ opacity: 0.55, marginLeft: 5 }}>
                  {isLoaded ? count : '…'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && items.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', overflow: 'hidden', opacity: Math.max(0.25, 1 - i * 0.06) }}>
              <div className="animate-pulse">
                <div style={{ height: 168, background: 'var(--bg-elevated)' }} />
                <div className="p-4 space-y-2">
                  <div style={{ height: 12, background: 'var(--bg-elevated)', width: '85%' }} />
                  <div style={{ height: 12, background: 'var(--bg-elevated)', width: '60%' }} />
                  <div style={{ height: 10, background: 'var(--bg-elevated)', width: '90%', marginTop: 10 }} />
                  <div style={{ height: 10, background: 'var(--bg-elevated)', width: '72%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {paginated.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map((item, i) => (
              <NewsCard key={`${item.source}-${i}-p${page}`} item={item} />
            ))}
            {/* Still loading — ghost cards to pad last row */}
            {loading && paginated.length < PAGE_SIZE &&
              Array.from({ length: Math.min(3, PAGE_SIZE - paginated.length) }).map((_, i) => (
                <div key={`ghost-${i}`} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', overflow: 'hidden', opacity: 0.4 }}>
                  <div className="animate-pulse">
                    <div style={{ height: 168, background: 'var(--bg-elevated)' }} />
                    <div className="p-4 space-y-2">
                      <div style={{ height: 12, background: 'var(--bg-elevated)', width: '75%' }} />
                      <div style={{ height: 12, background: 'var(--bg-elevated)', width: '55%' }} />
                    </div>
                  </div>
                </div>
              ))
            }
          </div>

          <Pagination
            page={page}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onChange={handlePageChange}
          />
        </>
      )}

      {!loading && filtered.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            No articles available from this source right now.
          </p>
        </div>
      )}
    </div>
  );
}
