// Quick chat for landing-page visitors (ADR-007). Messages reach the admin console Inbox;
// replies come back here by polling. Visitor text is rendered as plain React text only.
import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, ArrowUp, RotateCcw } from 'lucide-react';
import { BrandMark } from '../ui';
import {
  chatAvailable,
  savedChat,
  rememberChat,
  chatStart,
  chatSend,
  chatPoll,
  chatError,
  mergeMessages,
  chatTime,
} from '../lib/chat';

const OPEN_POLL = 5000,
  CLOSED_POLL = 30000;
const icon = { strokeWidth: 1.75, 'aria-hidden': true };

export function ChatWidget() {
  const available = chatAvailable();
  const [open, setOpen] = useState(false),
    [chat, setChat] = useState(() => (available ? savedChat() : null)),
    [messages, setMessages] = useState([]),
    [status, setStatus] = useState('Open'),
    [form, setForm] = useState({ name: '', contact: '', body: '' }),
    [draft, setDraft] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const launcher = useRef(null),
    panel = useRef(null),
    log = useRef(null),
    lastId = useRef(0),
    openRef = useRef(open);
  openRef.current = open;
  const lastAdmin = [...messages].reverse().find((m) => m.sender === 'admin')?.id || 0;
  const unread = !open && chat && lastAdmin > (chat.seen || 0);

  function reset() {
    rememberChat(null);
    setChat(null);
    setMessages([]);
    setStatus('Open');
    lastId.current = 0;
    setError('');
  }
  function receive(result) {
    setStatus(result.status || 'Open');
    setMessages((current) => {
      const next = mergeMessages(current, result.messages);
      lastId.current = next.at(-1)?.id || lastId.current;
      return next;
    });
  }
  // Mark admin replies as seen while the panel is open.
  useEffect(() => {
    if (!open || !chat || !lastAdmin || lastAdmin <= (chat.seen || 0)) return;
    const next = { ...chat, seen: lastAdmin };
    rememberChat(next);
    setChat(next);
  }, [open, lastAdmin]);
  // Poll for replies: often while open, rarely while closed, never in a hidden tab.
  useEffect(() => {
    if (!chat?.thread) return;
    let stopped = false;
    const tick = async (force) => {
      if (stopped || (!force && document.hidden)) return;
      try {
        receive(await chatPoll(chat, lastId.current));
      } catch (e) {
        if (/Conversation not found/i.test(e.message)) reset();
      }
    };
    tick(true);
    const id = setInterval(tick, open ? OPEN_POLL : CLOSED_POLL);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [chat?.thread, open]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages.length, open]);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector('input, textarea, button.lp-chat-primary')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, Boolean(chat)]);
  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  async function start(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await chatStart(form.name, form.contact, form.body);
      const next = { thread: result.thread, token: result.token, seen: 0 };
      rememberChat(next);
      lastId.current = 0;
      setMessages([]);
      receive(result);
      setChat(next);
      setForm((f) => ({ ...f, body: '' }));
    } catch (e) {
      setError(chatError(e));
    } finally {
      setBusy(false);
    }
  }
  async function send(e) {
    e.preventDefault();
    if (busy || !draft.trim()) return;
    setBusy(true);
    setError('');
    try {
      receive(await chatSend(chat, draft));
      setDraft('');
    } catch (e) {
      if (/closed/i.test(e.message)) setStatus('Closed');
      setError(chatError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lp-chat">
      {open && (
        <section
          className="lp-chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="lp-chat-title"
          ref={panel}
        >
          <header>
            <BrandMark size={28} tone="tile" label="" />
            <div>
              <h2 id="lp-chat-title">Chat with Bawa</h2>
              <small>We usually reply within a day.</small>
            </div>
            <button className="lp-chat-x" aria-label="Close chat" onClick={close}>
              <X size={18} {...icon} />
            </button>
          </header>

          {!available ? (
            <div className="lp-chat-empty">
              <p>
                Chat is available on the live Bawa site. In this preview you can explore the page,
                but messages are not sent.
              </p>
            </div>
          ) : !chat ? (
            <form className="lp-chat-form" onSubmit={start}>
              <p className="lp-chat-intro">
                Ask anything about Bawa: plans, setup or whether it fits your trips. Leave your
                email or WhatsApp in case you close this page.
              </p>
              <label>
                Your name
                <input
                  value={form.name}
                  maxLength={60}
                  required
                  autoComplete="name"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Email or WhatsApp <span>optional</span>
                <input
                  value={form.contact}
                  maxLength={120}
                  autoComplete="email"
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                />
              </label>
              <label>
                Message
                <textarea
                  value={form.body}
                  maxLength={2000}
                  rows={4}
                  required
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </label>
              {error && (
                <p className="lp-chat-error" role="alert">
                  {error}
                </p>
              )}
              <button className="lp-btn primary block lp-chat-primary" disabled={busy}>
                {busy ? 'Sending…' : 'Send message'}
              </button>
            </form>
          ) : (
            <>
              <div className="lp-chat-log" ref={log} aria-live="polite" aria-label="Conversation">
                {messages.map((m) => (
                  <div key={m.id} className={`lp-bubble ${m.sender}`}>
                    <p>{m.body}</p>
                    <small>
                      {m.sender === 'admin' ? 'Bawa · ' : ''}
                      {chatTime(m.date)}
                    </small>
                  </div>
                ))}
                {messages.length > 0 && !messages.some((m) => m.sender === 'admin') && (
                  <p className="lp-chat-wait">
                    Thanks! Your message is with the team. Replies show up here, even if you come
                    back later on this device.
                  </p>
                )}
              </div>
              {error && (
                <p className="lp-chat-error" role="alert">
                  {error}
                </p>
              )}
              {status === 'Open' ? (
                <form className="lp-chat-compose" onSubmit={send}>
                  <textarea
                    aria-label="Message"
                    placeholder="Write a message"
                    value={draft}
                    rows={1}
                    maxLength={2000}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) send(e);
                    }}
                  />
                  <button aria-label="Send" disabled={busy || !draft.trim()}>
                    <ArrowUp size={17} {...icon} />
                  </button>
                </form>
              ) : (
                <div className="lp-chat-closed">
                  <span>This conversation is closed.</span>
                  <button className="lp-btn outline" onClick={reset}>
                    <RotateCcw size={14} {...icon} /> Start a new conversation
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
      <button
        ref={launcher}
        className="lp-chat-launcher"
        aria-label={open ? 'Close chat' : unread ? 'Open chat, new reply' : 'Open chat'}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? <X size={22} {...icon} /> : <MessageCircle size={22} {...icon} />}
        {!open && <span className="lp-chat-label">Chat with us</span>}
        {unread && <span className="lp-chat-dot" aria-hidden="true" />}
      </button>
    </div>
  );
}
