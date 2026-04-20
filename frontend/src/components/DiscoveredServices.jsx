import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const DANGER_PORTS = new Set([23, 445, 3306, 3389, 5432, 5900, 6379, 9200, 11211, 27017, 28017]);

export default function DiscoveredServices({ reconData }) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  if (!reconData) return null;

  const { ip, open_ports = {}, discovered_software = {}, web_server_banner, error } = reconData;

  if (error) {
    return (
      <div
        className="p-4 text-xs"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)',
          borderLeft: '3px solid var(--border-bright)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>⚠ {t('recon.resolve_error_title')}</span>
        <br />
        <span style={{ opacity: 0.6 }}>{t('recon.resolve_error_hint')}</span>
      </div>
    );
  }

  const portEntries = Object.entries(open_ports)
    .map(([port, val]) => ({
      port: Number(port),
      service: typeof val === 'object' ? val.service : val,
      danger: typeof val === 'object' ? val.danger : DANGER_PORTS.has(Number(port)),
    }))
    .sort((a, b) => a.port - b.port);

  const swEntries = Object.entries(discovered_software);
  const dangerPorts = portEntries.filter(p => p.danger);
  const visible = showAll ? portEntries : portEntries.slice(0, 16);

  if (portEntries.length === 0 && swEntries.length === 0) {
    return (
      <div className="p-4 text-xs" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderLeft: '3px solid var(--border-bright)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        {t('recon.no_services_found')}
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-elevated)' }}>
        {ip && <span className="font-mono text-xs font-bold" style={{ color: 'var(--text)' }}>{ip}</span>}
        {web_server_banner && (
          <span className="font-mono text-xs px-2 py-0.5" style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand)', color: 'var(--brand)' }}>
            {web_server_banner}
          </span>
        )}
        {dangerPorts.length > 0 && (
          <span className="font-mono text-xs px-2 py-0.5 font-bold animate-pulse" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }}>
            ⚠ {dangerPorts.length} EXPOSED
          </span>
        )}
        <span className="label ml-auto">{portEntries.length} open ports · {swEntries.length} services detected</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Open ports grid */}
        {portEntries.length > 0 && (
          <div>
            <div className="label mb-3">{t('recon.open_ports')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
              {visible.map(({ port, service, danger }) => (
                <div
                  key={port}
                  className="flex items-center gap-2 px-3 py-2 font-mono text-xs"
                  style={{
                    background: danger ? 'rgba(239,68,68,0.06)' : 'var(--bg-elevated)',
                    border: danger ? '1px solid rgba(239,68,68,0.25)' : '1px solid var(--border-dim)',
                    borderLeft: danger ? '3px solid var(--danger)' : '3px solid var(--border)',
                    color: danger ? 'var(--danger)' : 'var(--text-secondary)',
                  }}
                >
                  <span className="font-bold" style={{ color: danger ? 'var(--danger)' : 'var(--text)' }}>
                    :{port}
                  </span>
                  <span className="truncate text-[10px]">{service}</span>
                </div>
              ))}
            </div>
            {portEntries.length > 16 && (
              <button
                onClick={() => setShowAll(s => !s)}
                className="mt-2 text-xs transition-colors"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
              >
                {showAll ? '↑ Show less' : `↓ +${portEntries.length - 16} more ports`}
              </button>
            )}
          </div>
        )}

        {/* Detected software */}
        {swEntries.length > 0 && (
          <div>
            <div className="label mb-3">{t('recon.detected_software')}</div>
            <div className="flex flex-wrap gap-2">
              {swEntries.map(([sw, version]) => (
                <span
                  key={sw}
                  className="px-3 py-1.5 font-mono text-xs font-semibold"
                  style={{
                    background: 'var(--brand-dim)',
                    border: '1px solid var(--brand)',
                    borderLeft: '3px solid var(--brand)',
                    color: 'var(--brand)',
                  }}
                >
                  {sw}{version ? ` ${version}` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {dangerPorts.length > 0 && (
          <p className="text-xs font-mono" style={{ color: 'rgba(239,68,68,0.6)', borderTop: '1px solid var(--border-dim)', paddingTop: '12px' }}>
            {t('recon.danger_note')}
          </p>
        )}
      </div>
    </div>
  );
}
