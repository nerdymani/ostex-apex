import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Results from './pages/Results';
import Settings from './pages/Settings';
import News from './pages/News';

export const ScanContext = createContext(null);
export function useScan() { return useContext(ScanContext); }

export const ThemeContext = createContext(null);
export function useTheme() { return useContext(ThemeContext); }

function AppShell({ scanData, setScanData }) {

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/news" element={<News />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-dim)' }}>
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <p className="label" style={{ fontSize: '8px', letterSpacing: '0.16em' }}>
            &copy; {new Date().getFullYear()} Ostex Apex · All rights reserved.
          </p>
          <a
            href="https://ostexs.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 transition-opacity hover:opacity-70"
          >
            <span className="label" style={{ fontSize: '8px', letterSpacing: '0.16em' }}>Powered by</span>
            <span
              className="font-black text-[10px] tracking-[0.16em]"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--brand)' }}
            >
              OSTEX
            </span>
            <span className="label" style={{ fontSize: '8px', letterSpacing: '0.14em' }}>Global Technologies</span>
            <svg width="9" height="9" fill="none" viewBox="0 0 12 12" style={{ color: 'var(--text-secondary)' }}>
              <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [scanData, setScanData] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('apex-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('apex-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <I18nextProvider i18n={i18n}>
        <ScanContext.Provider value={{ scanData, setScanData }}>
          <BrowserRouter>
            <AppShell scanData={scanData} setScanData={setScanData} />
          </BrowserRouter>
        </ScanContext.Provider>
      </I18nextProvider>
    </ThemeContext.Provider>
  );
}
