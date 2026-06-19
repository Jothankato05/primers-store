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
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
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
      const data = await res.json();
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
        className="fixed bottom-6 right-6 w-14 h-14 bg-primer-600 hover:bg-primer-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-200 z-50 hover:scale-105 active:scale-95"
        aria-label={open ? 'Close app assistant' : 'Open app assistant'}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden"
          style={{ height: '440px', maxWidth: 'calc(100vw - 3rem)' }}
        >
          {/* Header */}
          <div className="bg-primer-600 text-white px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">App Assistant</p>
              <p className="text-xs text-primer-200">Powered by AI</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-primer-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-snug">{m.content}</p>
                  {m.apps?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {m.apps.map(app => (
                        <Link
                          key={app.id}
                          to={`/store/${app.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 text-xs text-primer-700 font-medium hover:bg-primer-50 border border-primer-100 transition-colors"
                        >
                          <span>{app.name}</span>
                          <span className="text-primer-400">→</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-none px-3 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="What kind of app do you need?"
                className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primer-300 focus:border-transparent"
                maxLength={500}
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="p-2 bg-primer-600 hover:bg-primer-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0"
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
