import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../App';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const lang = i18n.language;
  const { theme, toggleTheme } = useTheme();

  function setLang(l) {
    if (lang === l) return;
    i18n.changeLanguage(l);
    localStorage.setItem('apex-lang', l);
  }

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: 'var(--bg-nav)',
        borderBottom: '1px solid var(--border-dim)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 gap-8">

          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 flex-shrink-0">
            {/* Circuit shield icon */}
            <div
              className="w-8 h-8 flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12 3.5V7C12 10 9.8 12.5 7 13C4.2 12.5 2 10 2 7V3.5L7 1Z"
                  stroke="var(--brand)" strokeWidth="1.2" fill="none" />
                <path d="M4.5 7L6.5 9L9.5 5" stroke="var(--brand)" strokeWidth="1.2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="flex flex-col leading-none">
              <div className="flex items-baseline gap-1.5">
                <span
                  className="font-black tracking-[0.2em] text-sm"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--brand)' }}
                >
                  OSTEX
                </span>
                <span
                  className="font-black tracking-[0.2em] text-sm text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  APEX
                </span>
              </div>
              <span className="label mt-0.5" style={{ letterSpacing: '0.18em', fontSize: '7px' }}>
                Threat Intelligence Platform
              </span>
            </div>
          </NavLink>

          {/* Divider */}
          <div className="hidden md:block h-6 w-px" style={{ background: 'var(--border)' }} />

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6 flex-1">
            {[
              { to: '/', label: t('nav.home'), end: true },
              { to: '/news', label: 'News' },
              { to: '/results', label: t('nav.results') },
              { to: '/settings', label: t('nav.settings') },
            ].map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `text-[10px] font-bold tracking-[0.14em] uppercase transition-colors ${
                    isActive ? 'text-white' : 'hover:text-white'
                  }`
                }
                style={({ isActive }) => ({ color: isActive ? 'var(--brand)' : 'var(--text-secondary)' })}
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-5 ml-auto">
            {/* Language */}
            <div className="flex items-center gap-2" style={{ borderRight: '1px solid var(--border)', paddingRight: '20px' }}>
              <button
                onClick={() => setLang('en')}
                className="text-[9px] font-black tracking-[0.18em] uppercase transition-colors"
                style={{ color: lang === 'en' ? 'var(--text)' : 'var(--text-secondary)' }}
              >
                EN
              </button>
              <span style={{ color: 'var(--border-bright)', fontSize: '10px' }}>|</span>
              <button
                onClick={() => setLang('sw')}
                className="text-[9px] font-black tracking-[0.18em] uppercase transition-colors"
                style={{ color: lang === 'sw' ? 'var(--text)' : 'var(--text-secondary)' }}
              >
                SW
              </button>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-7 h-7 transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--brand)'; e.currentTarget.style.borderColor = 'var(--brand)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>

            {/* CTA */}
            <NavLink
              to="/"
              className="flex items-center gap-2 px-4 py-1.5 text-white text-[10px] font-black tracking-[0.14em] uppercase transition-all hover:opacity-85"
              style={{
                background: 'var(--brand)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.12em',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />
              Run Scan
            </NavLink>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden ml-auto p-1.5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setOpen(!open)}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div
            className="md:hidden pb-4 pt-3 flex flex-col gap-1"
            style={{ borderTop: '1px solid var(--border-dim)' }}
          >
            {[
              { to: '/', label: t('nav.home'), end: true },
              { to: '/news', label: 'News' },
              { to: '/results', label: t('nav.results') },
              { to: '/settings', label: t('nav.settings') },
            ].map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className="px-3 py-2 text-[10px] font-bold tracking-[0.14em] uppercase"
                style={({ isActive }) => ({ color: isActive ? 'var(--brand)' : 'var(--text-secondary)' })}
                onClick={() => setOpen(false)}
              >
                {label}
              </NavLink>
            ))}
            <div className="flex items-center gap-3 px-3 pt-2">
              <button onClick={() => { setLang('en'); setOpen(false); }}
                className="text-[9px] font-black tracking-widest uppercase"
                style={{ color: lang === 'en' ? 'var(--text)' : 'var(--text-secondary)' }}>
                English
              </button>
              <span style={{ color: 'var(--border)' }}>|</span>
              <button onClick={() => { setLang('sw'); setOpen(false); }}
                className="text-[9px] font-black tracking-widest uppercase"
                style={{ color: lang === 'sw' ? 'var(--text)' : 'var(--text-secondary)' }}>
                Kiswahili
              </button>
              <span style={{ color: 'var(--border)' }}>|</span>
              <button
                onClick={() => { toggleTheme(); setOpen(false); }}
                className="text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
