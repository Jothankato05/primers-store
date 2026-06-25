import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "Hi! Tell me what kind of app you're looking for and I'll find the best match from the store.",
  apps: [],
};

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text, apps: [] }]);
    setLoading(true);

    try {
      const base = window.__PRIMERS__?.apiUrl || '/api';
      const history = messages.slice(1).map(({ role, content }) => ({ role, content }));
      const res = await fetch(`${base}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      let data;
      try { data = await res.json(); } catch { throw new Error('AI unavailable'); }
      if (!res.ok) throw new Error(data.error || 'AI unavailable');
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, apps: data.apps || [] }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't connect to the AI right now. Try browsing the store directly.", apps: [] }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-200 z-50 hover:scale-105 active:scale-95"
        style={{ background: 'var(--brand)' }}
        aria-label={open ? 'Close app assistant' : 'Open app assistant'}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 w-80 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
          style={{ height: 440, maxWidth: 'calc(100vw - 3rem)', background: 'var(--surface-card)', border: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 shrink-0" style={{ background: 'var(--brand)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight text-white">App Assistant</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>Powered by AI</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[88%] rounded-2xl px-3 py-2 text-sm"
                  style={m.role === 'user'
                    ? { background: 'var(--brand)', color: '#fff', borderBottomRightRadius: 4 }
                    : { background: 'var(--surface-sunken)', color: 'var(--text-body)', border: '1px solid var(--border)', borderBottomLeftRadius: 4 }
                  }
                >
                  <p className="whitespace-pre-wrap leading-snug">{m.content}</p>
                  {m.apps?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {m.apps.map(app => (
                        <Link
                          key={app.id}
                          to={`/store/${app.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/10"
                          style={{ background: 'rgba(92,124,250,0.15)', color: 'var(--brand-text)', border: '1px solid rgba(92,124,250,0.25)' }}
                        >
                          <span>{app.name}</span>
                          <span style={{ color: 'var(--brand-text)' }}>→</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-3 py-2.5" style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border)' }}>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="What kind of app do you need?"
                className="input-field flex-1 text-sm"
                maxLength={500}
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="p-2 text-white rounded-xl transition-colors shrink-0 disabled:opacity-40"
                style={{ background: 'var(--brand)' }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
