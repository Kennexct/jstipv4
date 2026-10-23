// Platform console Inbox (ADR-007): landing-page chats from visitors, answered by the owner.
import React, { useEffect, useRef, useState } from 'react';
import { useOps, useUnsavedChanges } from './store';
import { Header, Button, Empty, Callout, Tabs, I } from './ui';
import {
  adminChats,
  adminChat,
  adminChatReply,
  adminChatStatus,
  chatTime,
  CHAT_EVENT,
} from './lib/chat';

const REFRESH = 15000;
const filters = ['Open', 'Closed', 'Blocked', 'All'];
const statusTone = { Open: 'green', Closed: 'gray', Blocked: 'red' };

export function AdminInbox() {
  const { demoMode, copy, announce } = useOps();
  const [list, setList] = useState([]),
    [loaded, setLoaded] = useState(false),
    [filter, setFilter] = useState('Open'),
    [selected, setSelected] = useState(null),
    [thread, setThread] = useState(null),
    [draft, setDraft] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const log = useRef(null);
  useUnsavedChanges('inbox-reply', draft.trim().length > 0 && !busy);

  async function loadList() {
    try {
      const value = await adminChats();
      setList(value);
      setLoaded(true);
      setError('');
      window.dispatchEvent(new CustomEvent(CHAT_EVENT, { detail: value }));
    } catch (e) {
      setLoaded(true);
      setError(
        /migration has not been applied/i.test(e.message)
          ? 'Run the support chat migration (202610220001_support_chat.sql) in the Supabase SQL Editor to turn on the inbox.'
          : e.message,
      );
    }
  }
  async function openThread(id, quiet = false) {
    try {
      const value = await adminChat(id);
      setThread(value);
      // Opening marks the visitor's messages as read on the server; mirror it locally.
      setList((current) => {
        const next = current.map((t) => (t.id === id ? { ...t, unread: 0 } : t));
        window.dispatchEvent(new CustomEvent(CHAT_EVENT, { detail: next }));
        return next;
      });
    } catch (e) {
      if (!quiet) announce(e.message);
    }
  }
  useEffect(() => {
    if (demoMode) return;
    loadList();
    const id = setInterval(() => {
      if (!document.hidden) loadList();
    }, REFRESH);
    return () => clearInterval(id);
  }, [demoMode]);
  useEffect(() => {
    if (!selected || demoMode) return;
    setThread(null);
    openThread(selected);
    const id = setInterval(() => {
      if (!document.hidden) openThread(selected, true);
    }, REFRESH);
    return () => clearInterval(id);
  }, [selected]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [thread?.messages?.length]);

  async function reply(e) {
    e.preventDefault();
    if (busy || !draft.trim()) return;
    setBusy(true);
    try {
      setThread(await adminChatReply(selected, draft));
      setDraft('');
      loadList();
    } catch (e) {
      announce(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function setStatus(status) {
    setBusy(true);
    try {
      setThread(await adminChatStatus(selected, status));
      announce(
        status === 'Open'
          ? 'Conversation reopened.'
          : status === 'Closed'
            ? 'Conversation closed. The visitor can start a new one.'
            : 'Conversation blocked. The visitor can no longer send messages here.',
      );
      loadList();
    } catch (e) {
      announce(e.message);
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <Header
      title="Inbox"
      description="Questions from visitors on the Bawa landing page. Replies appear in their chat window."
    />
  );
  if (demoMode)
    return (
      <>
        {header}
        <Empty
          title="The inbox needs the live database"
          text="Landing-page chats are stored in Supabase. They appear here on the deployed site."
        />
      </>
    );
  const shown = list.filter((t) => filter === 'All' || t.status === filter);
  const counts = Object.fromEntries(
    filters.map((f) => [f, list.filter((t) => f === 'All' || t.status === f).length]),
  );
  return (
    <>
      {header}
      {error && <Callout>{error}</Callout>}
      <section className={`panel inbox ${selected ? 'has-thread' : ''}`}>
        <div className="inbox-list">
          <div className="inbox-filter">
            <Tabs options={filters} value={filter} onChange={setFilter} />
          </div>
          {shown.map((t) => (
            <button
              key={t.id}
              className={`inbox-row ${selected === t.id ? 'active' : ''} ${t.unread > 0 ? 'unread' : ''}`}
              onClick={() => setSelected(t.id)}
            >
              <span className="inbox-row-top">
                <strong>{t.name}</strong>
                <small>{chatTime(t.updated)}</small>
              </span>
              <span className="inbox-row-last">
                {t.last?.sender === 'admin' && <em>You: </em>}
                {t.last?.body}
              </span>
              {t.unread > 0 && (
                <span className="inbox-unread" aria-label={`${t.unread} unread`}>
                  {t.unread}
                </span>
              )}
            </button>
          ))}
          {loaded && !shown.length && (
            <p className="inbox-none">
              {filter === 'Open' && !list.length
                ? 'No conversations yet. Visitors can start one from the chat button on the landing page.'
                : `No ${filter.toLowerCase()} conversations (${counts.All} in total).`}
            </p>
          )}
        </div>
        <div className="inbox-thread">
          {!selected ? (
            <Empty
              title="Pick a conversation"
              text="Messages from visitors appear on the left, newest first."
            />
          ) : !thread ? (
            <p className="inbox-none">Loading conversation…</p>
          ) : (
            <>
              <div className="inbox-thread-head">
                <button
                  className="icon-btn inbox-back"
                  aria-label="Back to conversations"
                  onClick={() => setSelected(null)}
                >
                  <I name="ChevronLeft" />
                </button>
                <div>
                  <strong>{thread.name}</strong>
                  <small>
                    {thread.contact ? (
                      <button
                        className="text-btn"
                        onClick={() => copy(thread.contact, 'Contact')}
                        title="Copy contact"
                      >
                        {thread.contact} <I name="Copy" size={12} />
                      </button>
                    ) : (
                      'No contact left'
                    )}
                    {' · '}Started {chatTime(thread.created)}
                  </small>
                </div>
                <span className={`badge ${statusTone[thread.status]}`}>
                  <i />
                  {thread.status}
                </span>
                <div className="inbox-actions">
                  {thread.status === 'Open' ? (
                    <Button disabled={busy} onClick={() => setStatus('Closed')}>
                      Close
                    </Button>
                  ) : (
                    <Button disabled={busy} onClick={() => setStatus('Open')}>
                      {thread.status === 'Blocked' ? 'Unblock' : 'Reopen'}
                    </Button>
                  )}
                  {thread.status !== 'Blocked' && (
                    <Button disabled={busy} onClick={() => setStatus('Blocked')}>
                      Block
                    </Button>
                  )}
                </div>
              </div>
              <div className="inbox-log" ref={log} aria-live="polite">
                {thread.messages.map((m) => (
                  <div key={m.id} className={`inbox-bubble ${m.sender}`}>
                    <p>{m.body}</p>
                    <small>
                      {m.sender === 'admin' ? 'You · ' : thread.name + ' · '}
                      {chatTime(m.date)}
                    </small>
                  </div>
                ))}
              </div>
              {thread.status === 'Blocked' ? (
                <p className="inbox-none">Unblock this conversation to reply.</p>
              ) : (
                <form className="inbox-compose" onSubmit={reply}>
                  <textarea
                    aria-label="Reply"
                    placeholder={
                      thread.status === 'Closed'
                        ? 'Replying reopens the conversation'
                        : `Reply to ${thread.name}`
                    }
                    rows={2}
                    maxLength={2000}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) reply(e);
                    }}
                  />
                  <Button primary type="submit" disabled={busy || !draft.trim()}>
                    Send reply
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
