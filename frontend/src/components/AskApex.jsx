import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function AskApex({ scanComplete, scanData }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [quickShown, setQuickShown] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const analysis = scanData?.analysis;

  useEffect(() => {
    if (isOpen && messages.length === 0 && analysis) {
      const greeting = t('apex.greeting', {
        risk_level: analysis.risk_level || 'Unknown',
        risk_score: analysis.risk_score ?? '?',
      });
      setMessages([{ role: 'apex', text: greeting }]);
    }
  }, [isOpen, analysis, t, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  function openPanel() {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function closePanel() {
    setIsOpen(false);
    setMessages([]);
    setQuickShown(true);
  }

  async function sendMessage(text) {
    if (!text.trim() || streaming) return;
    setQuickShown(false);
    const userMsg = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setStreaming(true);
    setMessages(prev => [...prev, { role: 'apex', text: '', streaming: true }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, scan_context: scanData }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              setMessages(prev => {
                const msgs = [...prev];
                msgs[msgs.length - 1] = { role: 'apex', text: `Error: ${parsed.error}` };
                return msgs;
              });
            } else if (parsed.content) {
              setMessages(prev => {
                const msgs = [...prev];
                const last = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = { ...last, text: last.text + parsed.content };
                return msgs;
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { role: 'apex', text: `Connection error: ${e.message}` };
        return msgs;
      });
    } finally {
      setMessages(prev => {
        const msgs = [...prev];
        if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], streaming: false };
        return msgs;
      });
      setStreaming(false);
    }
  }

  const quickQuestions = [
    t('apex.quick_q1'),
    t('apex.quick_q2'),
    t('apex.quick_q3'),
    t('apex.quick_q4'),
    t('apex.quick_q5'),
  ];

  if (!scanComplete) return null;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={openPanel}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
          style={{
            background: 'var(--brand)',
            boxShadow: '0 0 28px var(--brand-glow)',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          }}
          title={t('apex.title')}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden"
          style={{
            width: 400,
            height: 520,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--brand)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-dim)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 flex items-center justify-center"
                style={{ background: 'var(--brand)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              >
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span
                className="text-sm font-black tracking-wider uppercase"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
              >
                {t('apex.title')}
              </span>
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--brand)' }}>
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: 'var(--brand)' }}
                />
                {t('apex.ready')}
              </span>
            </div>
            <button
              onClick={closePanel}
              className="p-1 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  {msg.role === 'apex' && (
                    <p
                      className="text-[9px] font-black mb-1 ml-1"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}
                    >
                      {t('apex.label')}
                    </p>
                  )}
                  <div
                    className="px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      background: msg.role === 'user' ? 'var(--bg-hover)' : 'var(--bg-elevated)',
                      border: '1px solid var(--border-dim)',
                      borderLeft: msg.role === 'apex' ? '2px solid var(--brand)' : '2px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  >
                    {msg.text}
                    {msg.streaming && (
                      <span
                        className="inline-block w-1 h-3.5 ml-0.5 animate-pulse align-middle"
                        style={{ background: 'var(--brand)' }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Quick question chips */}
            {quickShown && messages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    disabled={streaming}
                    className="px-2.5 py-1.5 text-xs text-left transition-colors disabled:opacity-40"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-dim)',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--brand)';
                      e.currentTarget.style.color = 'var(--brand)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-dim)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="px-3 py-3 flex-shrink-0"
            style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-dim)' }}
          >
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder={t('apex.placeholder')}
                disabled={streaming}
                rows={1}
                className="flex-1 px-3 py-2 text-sm font-mono focus:outline-none resize-none disabled:opacity-50 transition-colors"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  maxHeight: 80,
                }}
                onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={streaming || !input.trim()}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center transition-all disabled:opacity-40"
                style={{ background: 'var(--brand)' }}
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
